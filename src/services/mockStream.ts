import type { ActivityEvent, RegionKey, Severity, StreamPayload, TelemetryPoint } from '../types/telemetry';
import { clamp } from '../utils/format';

type MessageHandler = (payload: unknown) => void;
type StatusHandler = (online: boolean) => void;

const regions: RegionKey[] = ['NA', 'EU', 'APAC', 'AFR', 'LATAM'];
const services = ['Edge API', 'Payments', 'Auth Mesh', 'Telemetry Bus', 'Model Gateway', 'Risk Engine'];
const alertCopy: Record<Severity, string[]> = {
  info: ['Traffic normalized', 'New deployment sample received', 'Cache hit ratio improved'],
  warning: ['Latency drift detected', 'Error budget burn rising', 'Queue pressure elevated'],
  critical: ['Suspicious request burst blocked', 'Regional failover triggered', 'Threat signature escalated'],
};

export class MockRealtimeStream {
  private timer: number | undefined;
  private onlineTimer: number | undefined;
  private sequence = 0;
  private online = false;
  private base = {
    throughput: 9800,
    latency: 84,
    errorRate: 0.52,
    cpu: 56,
    memory: 61,
    threats: 9,
  };

  constructor(
    private readonly onMessage: MessageHandler,
    private readonly onStatus: StatusHandler,
    private readonly intervalMs = 850,
  ) {}

  connect(): void {
    window.clearInterval(this.timer);
    window.clearInterval(this.onlineTimer);
    this.online = true;
    this.onStatus(true);
    this.timer = window.setInterval(() => this.emit(), this.intervalMs);
    this.onlineTimer = window.setInterval(() => this.simulateConnectionQuality(), 14000);
  }

  close(): void {
    window.clearInterval(this.timer);
    window.clearInterval(this.onlineTimer);
    this.online = false;
    this.onStatus(false);
  }

  private simulateConnectionQuality(): void {
    if (Math.random() > 0.18) return;
    this.online = false;
    this.onStatus(false);
    window.clearInterval(this.timer);
    window.setTimeout(() => {
      this.online = true;
      this.onStatus(true);
      this.timer = window.setInterval(() => this.emit(), this.intervalMs);
    }, 900 + Math.random() * 1800);
  }

  private emit(): void {
    if (!this.online) return;
    this.sequence += 1;
    const now = Date.now();
    const wave = Math.sin(this.sequence / 8);
    const burst = Math.random() > 0.88 ? 1.8 : 1;
    const region = regions[this.sequence % regions.length];

    this.base = {
      throughput: clamp(this.base.throughput + (Math.random() - 0.42) * 520 + wave * 180, 4200, 22500),
      latency: clamp(this.base.latency + (Math.random() - 0.5) * 16 + burst * 5, 28, 260),
      errorRate: clamp(this.base.errorRate + (Math.random() - 0.48) * 0.14 + (burst > 1 ? 0.22 : 0), 0.04, 5.8),
      cpu: clamp(this.base.cpu + (Math.random() - 0.46) * 6, 18, 96),
      memory: clamp(this.base.memory + (Math.random() - 0.49) * 4, 22, 94),
      threats: clamp(this.base.threats + (Math.random() - 0.55) * 5 + (burst > 1 ? 8 : 0), 0, 80),
    };

    const point: TelemetryPoint = {
      id: `pt-${now}-${this.sequence}`,
      timestamp: now,
      throughput: Math.round(this.base.throughput),
      latency: Number(this.base.latency.toFixed(1)),
      errorRate: Number(this.base.errorRate.toFixed(2)),
      cpu: Number(this.base.cpu.toFixed(1)),
      memory: Number(this.base.memory.toFixed(1)),
      threats: Math.round(this.base.threats),
      region,
    };

    const payload: StreamPayload = {
      point,
      event: Math.random() > 0.36 ? this.createEvent(now, region, point) : undefined,
    };

    if (Math.random() > 0.985) {
      this.onMessage({ malformed: true, point: null });
      return;
    }

    this.onMessage(payload);
  }

  private createEvent(timestamp: number, region: RegionKey, point: TelemetryPoint): ActivityEvent {
    const severity: Severity = point.errorRate > 3.2 || point.threats > 46 ? 'critical' : point.latency > 150 ? 'warning' : 'info';
    const messages = alertCopy[severity];
    return {
      id: `evt-${timestamp}-${this.sequence}`,
      timestamp,
      service: services[Math.floor(Math.random() * services.length)],
      region,
      severity,
      message: messages[Math.floor(Math.random() * messages.length)],
      value: severity === 'critical' ? point.threats : severity === 'warning' ? point.latency : point.throughput,
    };
  }
}
