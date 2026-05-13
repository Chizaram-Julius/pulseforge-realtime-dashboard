<script setup lang="ts">
import { Activity, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-vue-next';
import type { MetricCard } from '../../types/telemetry';

defineProps<{ metric: MetricCard }>();
</script>

<template>
  <article class="metric-card" :data-tone="metric.tone">
    <div class="metric-icon">
      <Activity :size="18" aria-hidden="true" />
    </div>
    <div class="metric-body">
      <span>{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
      <small>{{ metric.detail }}</small>
    </div>
    <div class="metric-delta" :data-up="metric.change > 0" :data-down="metric.change < 0">
      <ArrowUpRight v-if="metric.change > 0" :size="14" aria-hidden="true" />
      <ArrowDownRight v-else-if="metric.change < 0" :size="14" aria-hidden="true" />
      <Minus v-else :size="14" aria-hidden="true" />
      {{ Math.abs(metric.change).toLocaleString() }}
    </div>
  </article>
</template>
