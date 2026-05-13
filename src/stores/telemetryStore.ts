import { computed, reactive, readonly } from 'vue';
import { MockRealtimeStream } from '../services/mockStream';
import { validatePayload } from '../services/payloadValidator';
import type { ActivityEvent, MetricCard, RegionKey, Severity, StreamFilters, StreamStatus, TelemetryPoint } from '../types/telemetry';
import { compactNumber, percentFormatter } from '../utils/format';

const MAX_POINTS = 720;
const MAX_EVENTS = 300;
const allRegions: RegionKey[] = ['NA', 'EU', 'APAC', 'AFR', 'LATAM'];
const allSeverities: Severity[] = ['info', 'warning', 'critical'];
const services = ['Edge API', 'Payments', 'Auth Mesh', 'Telemetry Bus', 'Model Gateway', 'Risk Engine'];

interface TelemetryState {
  points: TelemetryPoint[];
  events: ActivityEvent[];
  status: StreamStatus;
  invalidPayloads: number;
  lastError: string;
  filters: StreamFilters;
  enabledMetrics: Record<'throughput' | 'latency' | 'cpu' | 'errorRate', boolean>;
  selectedPointId: string;
}

const state = reactive<TelemetryState>({
  points: [],
  events: [],
  status: 'connecting',
  invalidPayloads: 0,
  lastError: '',
  filters: {
    range: 300,
    services: [...services],
    regions: [...allRegions],
    severities: [...allSeverities],
    chartMode: 'area',
    query: '',
  },
  enabledMetrics: {
    throughput: true,
    latency: true,
    cpu: true,
    errorRate: false,
  },
  selectedPointId: '',
});

let stream: MockRealtimeStream | null = null;
let reconnectAttempts = 0;
let reconnectTimer: number | undefined;
let flushTimer: number | undefined;
let pendingPoints: TelemetryPoint[] = [];
let pendingEvents: ActivityEvent[] = [];

function flushPending(): void {
  if (pendingPoints.length) {
    state.points = [...state.points, ...pendingPoints].slice(-MAX_POINTS);
    pendingPoints = [];
  }
  if (pendingEvents.length) {
    state.events = [...pendingEvents.reverse(), ...state.events].slice(0, MAX_EVENTS);
    pendingEvents = [];
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    flushPending();
  }, 160);
}

function handlePayload(raw: unknown): void {
  const payload = validatePayload(raw);
  if (!payload) {
    state.invalidPayloads += 1;
    state.lastError = 'Malformed stream payload was rejected safely.';
    return;
  }
  pendingPoints.push(payload.point);
  if (payload.event) pendingEvents.push(payload.event);
  scheduleFlush();
}

function handleStatus(online: boolean): void {
  if (online) {
    reconnectAttempts = 0;
    state.status = 'live';
    state.lastError = '';
    return;
  }
  if (state.status === 'paused') return;
  state.status = 'reconnecting';
  state.lastError = 'Stream interrupted. Reconnecting with backoff.';
  window.clearTimeout(reconnectTimer);
  reconnectAttempts += 1;
  reconnectTimer = window.setTimeout(() => {
    if (stream && state.status !== 'paused') stream.connect();
  }, Math.min(8000, 700 * reconnectAttempts));
}

function latest(): TelemetryPoint | undefined {
  return state.points[state.points.length - 1];
}

function previous(): TelemetryPoint | undefined {
  return state.points[state.points.length - 8] ?? state.points[state.points.length - 2];
}

function metricTone(value: number, limits: [number, number], inverse = false): MetricCard['tone'] {
  const [watch, danger] = limits;
  const dangerHit = inverse ? value < danger : value > danger;
  const watchHit = inverse ? value < watch : value > watch;
  if (dangerHit) return 'danger';
  if (watchHit) return 'watch';
  return 'good';
}

const filteredPoints = computed(() => {
  const since = Date.now() - state.filters.range * 1000;
  return state.points.filter((point) => point.timestamp >= since && state.filters.regions.includes(point.region));
});

const filteredEvents = computed(() => {
  const query = state.filters.query.trim().toLowerCase();
  return state.events.filter((event) => {
    const matchesQuery = !query || `${event.service} ${event.message} ${event.region}`.toLowerCase().includes(query);
    return (
      matchesQuery &&
      state.filters.services.includes(event.service) &&
      state.filters.regions.includes(event.region) &&
      state.filters.severities.includes(event.severity)
    );
  });
});

const metricCards = computed<MetricCard[]>(() => {
  const now = latest();
  const then = previous();
  if (!now) {
    return [
      { label: 'Throughput', value: '0/s', change: 0, tone: 'neutral', detail: 'Awaiting packets' },
      { label: 'Latency', value: '0ms', change: 0, tone: 'neutral', detail: 'Awaiting packets' },
      { label: 'Threats', value: '0', change: 0, tone: 'neutral', detail: 'Awaiting packets' },
      { label: 'Error Rate', value: '0%', change: 0, tone: 'neutral', detail: 'Awaiting packets' },
    ];
  }

  const delta = (current: number, past = current) => Number((current - past).toFixed(2));
  return [
    {
      label: 'Throughput',
      value: `${compactNumber.format(now.throughput)}/s`,
      change: delta(now.throughput, then?.throughput),
      tone: metricTone(now.throughput, [7600, 5200], true),
      detail: 'global event intake',
    },
    {
      label: 'Latency',
      value: `${now.latency.toFixed(0)}ms`,
      change: delta(now.latency, then?.latency),
      tone: metricTone(now.latency, [140, 190]),
      detail: 'p95 response time',
    },
    {
      label: 'Threats',
      value: String(now.threats),
      change: delta(now.threats, then?.threats),
      tone: metricTone(now.threats, [30, 52]),
      detail: 'blocked signatures',
    },
    {
      label: 'Error Rate',
      value: `${percentFormatter.format(now.errorRate)}%`,
      change: delta(now.errorRate, then?.errorRate),
      tone: metricTone(now.errorRate, [1.8, 3.4]),
      detail: 'rolling failures',
    },
  ];
});

const regionLoad = computed(() => {
  return allRegions.map((region) => {
    const sample = filteredPoints.value.filter((point) => point.region === region).slice(-40);
    const avg = sample.reduce((sum, point) => sum + point.throughput, 0) / Math.max(1, sample.length);
    return { region, load: Math.round(avg), risk: Math.round(sample.at(-1)?.threats ?? 0) };
  });
});

export function useTelemetryStore() {
  function start(): void {
    if (stream) return;
    state.status = 'connecting';
    stream = new MockRealtimeStream(handlePayload, handleStatus);
    stream.connect();
  }

  function stop(): void {
    window.clearTimeout(reconnectTimer);
    window.clearTimeout(flushTimer);
    flushTimer = undefined;
    stream?.close();
    stream = null;
  }

  function pause(): void {
    state.status = 'paused';
    stream?.close();
  }

  function resume(): void {
    if (!stream) {
      start();
      return;
    }
    state.status = 'connecting';
    stream.connect();
  }

  function setRange(range: StreamFilters['range']): void {
    state.filters.range = range;
  }

  function setChartMode(mode: StreamFilters['chartMode']): void {
    state.filters.chartMode = mode;
  }

  function setQuery(query: string): void {
    state.filters.query = query.slice(0, 80);
  }

  function toggleRegion(region: RegionKey): void {
    const next = new Set(state.filters.regions);
    next.has(region) ? next.delete(region) : next.add(region);
    state.filters.regions = next.size ? [...next] : [region];
  }

  function toggleSeverity(severity: Severity): void {
    const next = new Set(state.filters.severities);
    next.has(severity) ? next.delete(severity) : next.add(severity);
    state.filters.severities = next.size ? [...next] : [severity];
  }

  function toggleMetric(metric: keyof TelemetryState['enabledMetrics']): void {
    state.enabledMetrics[metric] = !state.enabledMetrics[metric];
  }

  function inspectPoint(id: string): void {
    state.selectedPointId = id;
  }

  return {
    state: readonly(state),
    filteredPoints,
    filteredEvents,
    metricCards,
    regionLoad,
    services,
    allRegions,
    allSeverities,
    start,
    stop,
    pause,
    resume,
    setRange,
    setChartMode,
    setQuery,
    toggleRegion,
    toggleSeverity,
    toggleMetric,
    inspectPoint,
  };
}
