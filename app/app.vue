<template>
  <div class="min-h-screen bg-black text-white relative overflow-hidden z-10">
    <ClientOnly>
      <Perlin />
    </ClientOnly>

    <NuxtPage />

    <ClientOnly>
      <Controls />
    </ClientOnly>
  </div>
</template>
