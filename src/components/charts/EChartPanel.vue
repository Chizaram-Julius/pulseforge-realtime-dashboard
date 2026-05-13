<script setup lang="ts">
import { BarChart3 } from 'lucide-vue-next';
import type { EChartsOption } from 'echarts';
import type { EChartsType } from 'echarts/core';
import * as echarts from 'echarts/core';
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';

echarts.use([LineChart, BarChart, HeatmapChart, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const props = defineProps<{
  title: string;
  eyebrow: string;
  option: EChartsOption;
  height?: number;
}>();

const emit = defineEmits<{
  pointClick: [id: string];
}>();

const el = shallowRef<HTMLDivElement>();
let chart: EChartsType | null = null;
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!el.value) return;
  const instance = echarts.init(el.value, undefined, { renderer: 'canvas' });
  chart = instance;
  instance.setOption(props.option, { notMerge: true, lazyUpdate: true });
  instance.on('click', (params) => {
    const payload = Array.isArray(params.data) ? params.data[3] : undefined;
    if (typeof payload === 'string') emit('pointClick', payload);
  });
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(el.value);
});

watch(
  () => props.option,
  (option) => chart?.setOption(option, { notMerge: false, lazyUpdate: true }),
  { deep: false },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <section class="panel chart-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
      </div>
      <BarChart3 :size="20" aria-hidden="true" />
    </div>
    <div ref="el" class="chart-canvas" :style="{ height: `${height ?? 300}px` }" />
  </section>
</template>
