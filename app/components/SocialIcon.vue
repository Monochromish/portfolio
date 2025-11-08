<script setup lang="ts">
defineProps({
  href: { type: String, required: true },
  icon: { type: String, required: true },
  label: { type: String, required: true }
})
</script>

<template>
  <a
      :href="href"
      target="_blank"
      rel="noopener"
      class="group w-11 h-11 flex items-center justify-center rounded-xl
           border border-white/10 bg-white/7 backdrop-blur-xl
           hover:border-white/25 hover:bg-white/15 transition"
  >
    <Icon :name="icon" size="20" class="text-gray-400 group-hover:text-white transition" />
    <span class="sr-only">{{ label }}</span>
  </a>
</template>
