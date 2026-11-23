<script setup lang="ts">
const { toggle, dark } = useTheme()
const { morphing, disk, rays } = useSunMoon(dark)
</script>

<template>
  <button type="button" class="theme-toggle nav-chip" data-theme-toggle @click="toggle">
    <svg class="icon" :class="{ morphing }" viewBox="0 0 20 20" aria-hidden="true">
      <path class="moon" d="M16.2 12.4A6.6 6.6 0 0 1 7.6 3.8a6.6 6.6 0 1 0 8.6 8.6Z" />
      <g class="sun">
        <circle cx="10" cy="10" r="3.4" />
        <path d="M10 2.2v1.6M10 16.2v1.6M2.2 10h1.6M16.2 10h1.6M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M4.5 15.5l1.1-1.1M14.4 5.6l1.1-1.1" />
      </g>
      <g class="morph">
        <path ref="disk" />
        <line v-for="i in 8" :key="i" ref="rays" />
      </g>
    </svg>
    <span class="sr-only to-night">Switch to night</span>
    <span class="sr-only to-day">Switch to day</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  border: 0;
  font-size: 18px;
  background: none;
  cursor: pointer;
  view-transition-name: theme-toggle;
}

.theme-toggle:active {
  transform: scale(0.95);
}

@media (pointer: coarse) {
  /* the hit area reaches into the page's edge and the neighbouring link's padding */
  .theme-toggle::after {
    content: '';
    position: absolute;
    inset: 0 -6px 0 -5px;
  }
}

@media (max-width: 560px) {
  .theme-toggle {
    padding: 0 8px;
  }
}

.icon {
  width: 1em;
  height: 1em;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sun,
.morph,
:root.dark .moon {
  display: none;
}

:root.dark .sun {
  display: inline;
}

.icon.morphing .moon,
.icon.morphing .sun {
  display: none;
}

.icon.morphing .morph {
  display: inline;
}

.to-day,
:root.dark .to-night {
  display: none;
}

:root.dark .to-day {
  display: block;
}
</style>
