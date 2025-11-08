<script setup lang="ts">
defineProps({
  to: String,
  icon: String,
  title: String,
  subtitle: String,
  description: String,
})
</script>

<template>
  <NuxtLink
      :to="to"
      class="block rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl
           hover:border-white/20 hover:bg-white/10 transition p-5"
  >
    <div class="flex items-center gap-4">

      <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-white/10">
        <Icon :name="icon" size="22" class="text-gray-300" />
      </div>

      <div class="flex flex-col justify-center">
        <h2 class="text-base font-semibold leading-tight">
          {{ title }}
        </h2>
        <p class="text-sm text-gray-400 leading-tight">
          {{ subtitle }}
        </p>
      </div>

    </div>

    <p class="text-gray-300 text-sm leading-relaxed mt-4">
      {{ description }}
    </p>

  </NuxtLink>
</template>
