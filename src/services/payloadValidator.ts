import type { ActivityEvent, StreamPayload, TelemetryPoint } from '../types/telemetry';
import { sanitizeText } from '../utils/format';

const severities = new Set(['info', 'warning', 'critical']);
const regions = new Set(['NA', 'EU', 'APAC', 'AFR', 'LATAM']);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validatePoint(input: unknown): TelemetryPoint | null {
  if (!input || typeof input !== 'object') return null;
  const point = input as Record<string, unknown>;
  if (
    typeof point.id !== 'string' ||
    !isFiniteNumber(point.timestamp) ||
    !isFiniteNumber(point.throughput) ||
    !isFiniteNumber(point.latency) ||
    !isFiniteNumber(point.errorRate) ||
    !isFiniteNumber(point.cpu) ||
    !isFiniteNumber(point.memory) ||
    !isFiniteNumber(point.threats) ||
    typeof point.region !== 'string' ||
    !regions.has(point.region)
  ) {
    return null;
  }

  return {
    id: sanitizeText(point.id),
    timestamp: point.timestamp,
    throughput: Math.max(0, point.throughput),
    latency: Math.max(0, point.latency),
    errorRate: Math.max(0, point.errorRate),
    cpu: Math.min(100, Math.max(0, point.cpu)),
    memory: Math.min(100, Math.max(0, point.memory)),
    threats: Math.max(0, Math.round(point.threats)),
    region: point.region as TelemetryPoint['region'],
  };
}

function validateEvent(input: unknown): ActivityEvent | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const event = input as Record<string, unknown>;
  if (
    typeof event.id !== 'string' ||
    !isFiniteNumber(event.timestamp) ||
    typeof event.service !== 'string' ||
    typeof event.region !== 'string' ||
    typeof event.severity !== 'string' ||
    !regions.has(event.region) ||
    !severities.has(event.severity) ||
    typeof event.message !== 'string' ||
    !isFiniteNumber(event.value)
  ) {
    return undefined;
  }

  return {
    id: sanitizeText(event.id),
    timestamp: event.timestamp,
    service: sanitizeText(event.service),
    region: event.region as ActivityEvent['region'],
    severity: event.severity as ActivityEvent['severity'],
    message: sanitizeText(event.message),
    value: event.value,
  };
}

export function validatePayload(input: unknown): StreamPayload | null {
  if (!input || typeof input !== 'object') return null;
  const payload = input as Record<string, unknown>;
  const point = validatePoint(payload.point);
  if (!point) return null;

  return {
    point,
    event: validateEvent(payload.event),
  };
}
