<script setup lang="ts">
import { ref } from 'vue'
import { usePerlinSettings } from '~/composables/usePerlinSettings'

const open = ref(false)
const { noiseScale, timeFlow, height, reset } = usePerlinSettings()
</script>

<template>
  <button
      @click="open = !open"
      aria-label="Open perlin controls"
      class="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full
         bg-white/5 border border-white/10 backdrop-blur
         opacity-50 hover:opacity-100 hover:bg-white/10
         transition flex items-center justify-center"
  >
    <Icon name="gg:edit-noise" size="20" class="text-white/80" />
  </button>

  <div
      v-if="open"
      class="fixed bottom-20 right-6 z-50 p-4 w-64 space-y-4 rounded-xl
           bg-black/60 border border-white/10 backdrop-blur-xl"
  >
    <h3 class="text-sm font-semibold text-gray-200">Perlin Controls</h3>

    <div class="space-y-3">

      <label class="flex flex-col text-xs text-gray-400">
        Noise Scale (texture)
        <input type="range" min="0" max="2" step="0.05" v-model.number="noiseScale"
               class="mt-1 accent-white" />
      </label>

      <label class="flex flex-col text-xs text-gray-400">
        Time Flow (speed)
        <input type="range" min="0" max="2" step="0.05" v-model.number="timeFlow"
               class="mt-1 accent-white" />
      </label>

      <label class="flex flex-col text-xs text-gray-400">
        Height (amplitude)
        <input type="range" min="0" max="80" step="1" v-model.number="height"
               class="mt-1 accent-white" />
      </label>

      <button
          @click="reset"
          class="w-full text-xs px-3 py-1.5 rounded-md
         bg-white/5 border border-white/10 text-gray-300
         hover:bg-white/10 transition"
      >
        Reset to Default
      </button>
    </div>
  </div>
</template>
