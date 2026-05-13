<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import type { SeriesOption } from 'echarts';
import { Activity, AlertTriangle, Database, RadioTower } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import EChartPanel from './components/charts/EChartPanel.vue';
import ActivityFeed from './components/dashboard/ActivityFeed.vue';
import DashboardControls from './components/dashboard/DashboardControls.vue';
import MetricCard from './components/dashboard/MetricCard.vue';
import MetricToggles from './components/dashboard/MetricToggles.vue';
import { useTelemetryStore } from './stores/telemetryStore';
import type { TelemetryPoint } from './types/telemetry';
import { formatTime } from './utils/format';

const store = useTelemetryStore();
const theme = ref<'dark' | 'light'>('dark');

const axisStyle = computed(() => ({
  color: theme.value === 'dark' ? '#8fa2bd' : '#5d6b7c',
  fontFamily: 'Inter, ui-sans-serif, system-ui',
}));

const grid = { top: 42, right: 18, bottom: 28, left: 48 };

function seriesData(metric: keyof TelemetryPoint) {
  return store.filteredPoints.value.map((point) => [point.timestamp, point[metric], point.region, point.id]);
}

function lineOption(): EChartsOption {
  const mode = store.state.filters.chartMode;
  const asBar = mode === 'bar';
  const asArea = mode === 'area';
  const series: SeriesOption[] = [];

  if (store.state.enabledMetrics.throughput) {
    series.push({
      name: 'Throughput',
      type: asBar ? 'bar' : 'line',
      smooth: true,
      showSymbol: false,
      sampling: 'lttb',
      large: true,
      areaStyle: asArea ? { opacity: 0.16 } : undefined,
      lineStyle: { width: 2 },
      itemStyle: { color: '#45d6b5' },
      data: seriesData('throughput'),
    });
  }

  if (store.state.enabledMetrics.latency) {
    series.push({
      name: 'Latency',
      type: asBar ? 'bar' : 'line',
      smooth: true,
      showSymbol: false,
      yAxisIndex: 1,
      sampling: 'lttb',
      areaStyle: asArea ? { opacity: 0.12 } : undefined,
      lineStyle: { width: 2 },
      itemStyle: { color: '#ffb454' },
      data: seriesData('latency'),
    });
  }

  if (store.state.enabledMetrics.cpu) {
    series.push({
      name: 'CPU',
      type: asBar ? 'bar' : 'line',
      smooth: true,
      showSymbol: false,
      yAxisIndex: 1,
      sampling: 'lttb',
      areaStyle: asArea ? { opacity: 0.1 } : undefined,
      itemStyle: { color: '#7c8cff' },
      data: seriesData('cpu'),
    });
  }

  if (store.state.enabledMetrics.errorRate) {
    series.push({
      name: 'Errors',
      type: asBar ? 'bar' : 'line',
      smooth: true,
      showSymbol: false,
      yAxisIndex: 1,
      sampling: 'lttb',
      areaStyle: asArea ? { opacity: 0.1 } : undefined,
      itemStyle: { color: '#ff5c7a' },
      data: seriesData('errorRate'),
    });
  }

  return {
    animationDuration: 280,
    animationEasing: 'cubicOut',
    backgroundColor: 'transparent',
    color: ['#45d6b5', '#ffb454', '#7c8cff', '#ff5c7a'],
    grid,
    legend: { top: 4, right: 6, textStyle: axisStyle.value },
    tooltip: {
      trigger: 'axis',
      confine: true,
      valueFormatter: (value) => `${Number(value).toLocaleString()}`,
    },
    xAxis: {
      type: 'time',
      axisLabel: { ...axisStyle.value, formatter: (value: number) => formatTime(value) },
      axisLine: { lineStyle: { color: 'rgba(143,162,189,.22)' } },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: axisStyle.value,
        splitLine: { lineStyle: { color: 'rgba(143,162,189,.13)' } },
      },
      {
        type: 'value',
        axisLabel: axisStyle.value,
        splitLine: { show: false },
      },
    ],
    series,
  };
}

const trafficOption = computed(lineOption);

const regionOption = computed<EChartsOption>(() => ({
  animationDuration: 350,
  backgroundColor: 'transparent',
  grid: { top: 24, right: 12, bottom: 28, left: 44 },
  tooltip: { trigger: 'axis', confine: true },
  xAxis: {
    type: 'category',
    data: store.regionLoad.value.map((item) => item.region),
    axisLabel: axisStyle.value,
    axisLine: { lineStyle: { color: 'rgba(143,162,189,.22)' } },
  },
  yAxis: {
    type: 'value',
    axisLabel: axisStyle.value,
    splitLine: { lineStyle: { color: 'rgba(143,162,189,.13)' } },
  },
  series: [
    {
      name: 'Regional Load',
      type: 'bar',
      barWidth: 28,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: '#58a6ff',
      },
      data: store.regionLoad.value.map((item) => item.load),
    },
  ],
}));

const heatmapOption = computed<EChartsOption>(() => {
  const regions = store.regionLoad.value.map((item) => item.region);
  const metrics = ['Load', 'Risk', 'CPU'];
  const latest = store.filteredPoints.value.at(-1);
  const data = store.regionLoad.value.flatMap((item, x) => [
    [x, 0, Math.round(item.load / 260)],
    [x, 1, item.risk],
    [x, 2, Math.round(latest?.cpu ?? 0)],
  ]);

  return {
    animationDuration: 300,
    backgroundColor: 'transparent',
    tooltip: { position: 'top', confine: true },
    grid: { top: 16, right: 20, bottom: 28, left: 52 },
    xAxis: { type: 'category', data: regions, axisLabel: axisStyle.value, splitArea: { show: true } },
    yAxis: { type: 'category', data: metrics, axisLabel: axisStyle.value, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: 100,
      show: false,
      inRange: { color: ['#102139', '#1f9f88', '#f0b84f', '#ef476f'] },
    },
    series: [{ name: 'Heat', type: 'heatmap', data, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10 } } }],
  };
});

const selectedPoint = computed(() => store.filteredPoints.value.find((point) => point.id === store.state.selectedPointId) ?? store.filteredPoints.value.at(-1));

onMounted(() => {
  document.documentElement.dataset.theme = theme.value;
  store.start();
});

onBeforeUnmount(() => store.stop());

function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme.value;
}
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand-lockup">
        <div class="brand-mark">
          <RadioTower :size="24" aria-hidden="true" />
        </div>
        <div>
          <p>PulseForge</p>
          <h1>Real-Time Operations Intelligence</h1>
        </div>
      </div>
      <div class="status-strip">
        <span :data-status="store.state.status">{{ store.state.status }}</span>
        <span>{{ store.filteredPoints.value.length.toLocaleString() }} points</span>
        <span>{{ store.state.invalidPayloads }} rejected</span>
      </div>
    </header>

    <DashboardControls
      :status="store.state.status"
      :range="store.state.filters.range"
      :chart-mode="store.state.filters.chartMode"
      :regions="store.allRegions"
      :severities="store.allSeverities"
      :active-regions="store.state.filters.regions"
      :active-severities="store.state.filters.severities"
      :query="store.state.filters.query"
      :theme="theme"
      @pause="store.pause"
      @resume="store.resume"
      @range="store.setRange"
      @chart-mode="store.setChartMode"
      @region="store.toggleRegion"
      @severity="store.toggleSeverity"
      @query="store.setQuery"
      @theme="toggleTheme"
    />

    <section class="metric-grid">
      <MetricCard v-for="metric in store.metricCards.value" :key="metric.label" :metric="metric" />
    </section>

    <section v-if="store.state.lastError" class="resilience-banner">
      <AlertTriangle :size="18" aria-hidden="true" />
      {{ store.state.lastError }}
    </section>

    <section class="dashboard-grid">
      <div class="main-column">
        <EChartPanel title="Streaming Telemetry" eyebrow="multi-series canvas chart" :option="trafficOption" :height="360" @point-click="store.inspectPoint" />
        <div class="split-grid">
          <EChartPanel title="Regional Load" eyebrow="live bar chart" :option="regionOption" :height="250" />
          <EChartPanel title="Risk Heatmap" eyebrow="bonus visualization" :option="heatmapOption" :height="250" />
        </div>
      </div>
      <aside class="side-column">
        <MetricToggles :enabled="store.state.enabledMetrics" @toggle="store.toggleMetric" />
        <section class="panel inspector-panel">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">inspect</span>
              <h2>Latest Packet</h2>
            </div>
            <Database :size="20" aria-hidden="true" />
          </div>
          <dl v-if="selectedPoint" class="inspector-list">
            <div><dt>Time</dt><dd>{{ formatTime(selectedPoint.timestamp) }}</dd></div>
            <div><dt>Region</dt><dd>{{ selectedPoint.region }}</dd></div>
            <div><dt>Throughput</dt><dd>{{ selectedPoint.throughput.toLocaleString() }}/s</dd></div>
            <div><dt>Latency</dt><dd>{{ selectedPoint.latency }}ms</dd></div>
            <div><dt>CPU</dt><dd>{{ selectedPoint.cpu }}%</dd></div>
            <div><dt>Memory</dt><dd>{{ selectedPoint.memory }}%</dd></div>
          </dl>
          <div v-else class="empty-state">Waiting for stream data.</div>
        </section>
        <ActivityFeed :events="store.filteredEvents.value" />
      </aside>
    </section>
  </main>
</template>
