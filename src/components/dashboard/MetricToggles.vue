<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next';

defineProps<{
  enabled: Record<'throughput' | 'latency' | 'cpu' | 'errorRate', boolean>;
}>();

const emit = defineEmits<{
  toggle: [metric: 'throughput' | 'latency' | 'cpu' | 'errorRate'];
}>();

const labels = {
  throughput: 'Throughput',
  latency: 'Latency',
  cpu: 'CPU',
  errorRate: 'Errors',
} as const;
</script>

<template>
  <section class="panel toggles-panel">
    <span class="eyebrow">datasets</span>
    <div class="toggle-grid">
      <button v-for="(_, key) in enabled" :key="key" class="dataset-toggle" :class="{ active: enabled[key] }" @click="emit('toggle', key)">
        <Eye v-if="enabled[key]" :size="16" aria-hidden="true" />
        <EyeOff v-else :size="16" aria-hidden="true" />
        {{ labels[key] }}
      </button>
    </div>
  </section>
</template>
