<script setup lang="ts">
const { alias, name } = useIdentity()
const url = `${useRuntimeConfig().public.siteUrl}/stickers`
const description = `Doodle on a sticker and stick it in ${alias ? 'Monochromish' : 'Himanshu'}’s sticker book.`
useSeoMeta({
  title: `Sticker book · ${name}`,
  description,
  ogTitle: 'Sticker book',
  ogDescription: description,
  ogUrl: url,
})
useHead({ link: [{ rel: 'canonical', href: url }] })
</script>

<template>
  <main id="content" class="shell">
    <GuestbookSection page />
  </main>
  <div class="page-end">
    <SiteFooter />
  </div>
</template>
