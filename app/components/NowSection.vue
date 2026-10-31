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
  gap: 40px;
}
@media (min-width: 720px) {
  .columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 36px;
  }
  /* a poster row is 66 + 2 x 8 px */
  .columns:has(> :nth-child(2)) {
    --now-row-height: 82px;
  }
  .columns > :only-child {
    grid-column: 1 / -1;
  }
}
</style>
