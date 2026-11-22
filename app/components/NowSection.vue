<script setup lang="ts">
const gone = reactive({ listening: false, watching: false })
</script>

<template>
  <section v-if="!(gone.listening && gone.watching)" id="now" class="section" aria-labelledby="now-title">
    <h2 id="now-title" class="sr-only">
      Now
    </h2>
    <div class="columns">
      <NowListening @unavailable="gone.listening = true" />
      <NowWatching @unavailable="gone.watching = true" />
    </div>
  </section>
</template>

<style scoped>
.columns {
  display: grid;
  gap: 72px;
}
@media (min-width: 900px) {
  .columns {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: start;
    column-gap: 64px;
  }
  /* one without the other keeps its own width; four posters across the whole page would be huge */
  .columns > :only-child {
    grid-column: 1 / -1;
    max-width: 40rem;
  }
}
</style>
