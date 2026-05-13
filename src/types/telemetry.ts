export type Severity = 'info' | 'warning' | 'critical';
export type StreamStatus = 'connecting' | 'live' | 'paused' | 'reconnecting' | 'error';
export type TimeRange = 60 | 300 | 3600;
export type ChartMode = 'line' | 'area' | 'bar';

export interface TelemetryPoint {
  id: string;
  timestamp: number;
  throughput: number;
  latency: number;
  errorRate: number;
  cpu: number;
  memory: number;
  threats: number;
  region: RegionKey;
}

export interface ActivityEvent {
  id: string;
  timestamp: number;
  service: string;
  region: RegionKey;
  severity: Severity;
  message: string;
  value: number;
}

export interface MetricCard {
  label: string;
  value: string;
  change: number;
  tone: 'good' | 'watch' | 'danger' | 'neutral';
  detail: string;
}

export type RegionKey = 'NA' | 'EU' | 'APAC' | 'AFR' | 'LATAM';

export interface StreamPayload {
  point: TelemetryPoint;
  event?: ActivityEvent;
}

export interface StreamFilters {
  range: TimeRange;
  services: string[];
  regions: RegionKey[];
  severities: Severity[];
  chartMode: ChartMode;
  query: string;
}
