<script setup lang="ts">
import { Moon, Pause, Play, RotateCcw, Search, Sun } from 'lucide-vue-next';
import type { ChartMode, RegionKey, Severity, StreamStatus, TimeRange } from '../../types/telemetry';

defineProps<{
  status: StreamStatus;
  range: TimeRange;
  chartMode: ChartMode;
  regions: readonly RegionKey[];
  severities: readonly Severity[];
  activeRegions: readonly RegionKey[];
  activeSeverities: readonly Severity[];
  query: string;
  theme: 'dark' | 'light';
}>();

const emit = defineEmits<{
  pause: [];
  resume: [];
  range: [range: TimeRange];
  chartMode: [mode: ChartMode];
  region: [region: RegionKey];
  severity: [severity: Severity];
  query: [query: string];
  theme: [];
}>();

const ranges: { label: string; value: TimeRange }[] = [
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '1h', value: 3600 },
];
const modes: ChartMode[] = ['area', 'line', 'bar'];
</script>

<template>
  <section class="controls panel">
    <div class="control-row primary-controls">
      <button class="icon-button stream-button" :title="status === 'paused' ? 'Resume stream' : 'Pause stream'" @click="status === 'paused' ? emit('resume') : emit('pause')">
        <Play v-if="status === 'paused'" :size="18" aria-hidden="true" />
        <Pause v-else :size="18" aria-hidden="true" />
      </button>
      <button class="icon-button" title="Toggle theme" @click="emit('theme')">
        <Sun v-if="theme === 'dark'" :size="18" aria-hidden="true" />
        <Moon v-else :size="18" aria-hidden="true" />
      </button>
      <div class="segmented" aria-label="Time range">
        <button v-for="item in ranges" :key="item.value" :class="{ active: range === item.value }" @click="emit('range', item.value)">
          {{ item.label }}
        </button>
      </div>
      <div class="segmented" aria-label="Chart mode">
        <button v-for="mode in modes" :key="mode" :class="{ active: chartMode === mode }" @click="emit('chartMode', mode)">
          {{ mode }}
        </button>
      </div>
    </div>

    <label class="search-box">
      <Search :size="16" aria-hidden="true" />
      <input :value="query" type="search" placeholder="Search live events" @input="emit('query', ($event.target as HTMLInputElement).value)" />
    </label>

    <div class="control-row chips">
      <button v-for="region in regions" :key="region" class="chip" :class="{ active: activeRegions.includes(region) }" @click="emit('region', region)">
        {{ region }}
      </button>
      <button v-for="severity in severities" :key="severity" class="chip severity" :data-severity="severity" :class="{ active: activeSeverities.includes(severity) }" @click="emit('severity', severity)">
        {{ severity }}
      </button>
    </div>

    <div class="connection-pill" :data-status="status">
      <RotateCcw v-if="status === 'reconnecting' || status === 'connecting'" :size="14" aria-hidden="true" />
      {{ status }}
    </div>
  </section>
</template>
