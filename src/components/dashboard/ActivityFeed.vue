<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next';
import type { ActivityEvent } from '../../types/telemetry';
import { formatAgo, formatTime } from '../../utils/format';

defineProps<{ events: ActivityEvent[] }>();
</script>

<template>
  <section class="panel feed-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">live activity</span>
        <h2>Incident Feed</h2>
      </div>
      <ShieldAlert :size="20" aria-hidden="true" />
    </div>
    <div v-if="!events.length" class="empty-state">No matching stream events yet.</div>
    <div v-else class="feed-list" role="log" aria-live="polite">
      <article v-for="event in events.slice(0, 80)" :key="event.id" class="feed-item" :data-severity="event.severity">
        <div class="feed-dot" />
        <div class="feed-main">
          <div class="feed-title">
            <strong>{{ event.service }}</strong>
            <span>{{ event.region }}</span>
          </div>
          <p>{{ event.message }}</p>
          <small>{{ formatTime(event.timestamp) }} · {{ formatAgo(event.timestamp) }}</small>
        </div>
        <b>{{ Math.round(event.value).toLocaleString() }}</b>
      </article>
    </div>
  </section>
</template>
