# PulseForge Real-Time Analytics Dashboard

PulseForge is a production-style Vue 3 + TypeScript dashboard for Stage 5A. It simulates a live operations platform with streaming telemetry, resilient connection behavior, smooth ECharts visualizations, filterable activity logs, metric inspection, and dark/light mode.

## Setup

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

## Live Demo

https://pulseforge-realtime-dashboard.netlify.app/

## Repository

https://github.com/Chizaram-Julius/pulseforge-realtime-dashboard

## Tech Stack

- **Framework:** Vue 3
- **Language:** TypeScript
- **Build Tool:** Vite
- **Charts & Visualization:** ECharts
- **Icons:** Lucide Vue
- **State Management:** Vue reactive/computed store pattern
- **Styling:** CSS3 with responsive grid/flex layouts, CSS variables, and dark/light theme tokens
- **Streaming:** Mock WebSocket-style telemetry generator with reconnect simulation
- **Validation/Security:** Custom payload validation and text sanitization

## Project Structure

```text
.
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── vite.config.ts
└── src
    ├── App.vue
    ├── main.ts
    ├── vite-env.d.ts
    ├── components
    │   ├── charts
    │   │   └── EChartPanel.vue
    │   └── dashboard
    │       ├── ActivityFeed.vue
    │       ├── DashboardControls.vue
    │       ├── MetricCard.vue
    │       └── MetricToggles.vue
    ├── services
    │   ├── mockStream.ts
    │   └── payloadValidator.ts
    ├── stores
    │   └── telemetryStore.ts
    ├── styles
    │   └── main.css
    ├── types
    │   └── telemetry.ts
    └── utils
        └── format.ts
```

## Architecture

- `src/services/mockStream.ts` simulates a WebSocket-like stream with live packets, rare malformed payloads, and temporary connection drops.
- `src/services/payloadValidator.ts` validates and sanitizes every incoming payload before it reaches UI state.
- `src/stores/telemetryStore.ts` is the centralized data layer. It owns stream lifecycle, bounded buffers, throttled state flushing, filters, derived metric cards, chart-ready data, and cleanup.
- `src/components/charts/EChartPanel.vue` is a reusable ECharts canvas wrapper with resize/dispose handling.
- `src/components/dashboard/*` contains reusable controls, metric cards, dataset toggles, and the live activity feed.

## State Management Strategy

The app uses a lightweight Vue reactive singleton store instead of adding Redux/Zustand-style machinery. That keeps the architecture explicit while still centralizing all streaming data, filters, connection status, and derived views. Components read computed slices and dispatch small store actions, so chart rendering stays separate from stream ingestion.

## Streaming Approach

The stream generator emits telemetry roughly every 850ms and models a real monitoring feed:

- throughput, latency, CPU, memory, error rate, threat counts
- regional data across `NA`, `EU`, `APAC`, `AFR`, and `LATAM`
- live incident events with `info`, `warning`, and `critical` severity
- simulated reconnects with backoff
- malformed payload injection to prove the UI rejects bad data safely

## Rendering Optimization Decisions

- Incoming packets are buffered and flushed every 160ms to avoid excessive Vue re-renders.
- Telemetry history is capped at 720 points and activity history at 300 events to prevent memory growth.
- ECharts uses canvas rendering, smooth updates, hidden symbols, and `lttb` sampling for dense line/area datasets.
- The feed renders only the newest 80 matching events while the store retains a larger bounded history.
- Charts are split into a dedicated `charts` chunk in Vite so the app bundle is easier to cache and reason about.
- Stream intervals, reconnect timers, resize observers, and chart instances are cleaned up on unmount.

## UX Features

- Pause/resume real-time streaming
- Last 1 minute, 5 minutes, and 1 hour ranges
- Area, line, and bar chart modes
- Toggle chart datasets on/off
- Region and severity filters
- Searchable live activity feed
- Data point inspection
- Responsive desktop, tablet, and mobile layouts
- Dark/light mode support
- Connection, empty, malformed payload, and reconnect states

## Trade-Offs

- The data source is mocked so reviewers can run the app without backend setup. The stream service is isolated so a real WebSocket or SSE client can replace it.
- ECharts is heavier than a tiny charting library, but it provides high-performance canvas rendering, responsive charts, heatmaps, and mature interaction behavior.
- Feed virtualization is implemented as capped rendering because the acceptance criteria need smooth recent activity, not an unbounded audit archive.
