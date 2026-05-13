import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['echarts'],
          vendor: ['vue', 'lucide-vue-next'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
