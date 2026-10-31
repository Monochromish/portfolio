<script setup lang="ts">
import { posts } from '#shared/writing'

if (!posts.length) throw createError({ status: 404, statusText: 'Page not found', fatal: true })

const url = `${useRuntimeConfig().public.siteUrl}/writing`
const { name } = useIdentity()
const description = 'Notes on interfaces, motion and the things I build.'
useSeoMeta({
  title: `Writing · ${name}`,
  description,
  ogTitle: 'Writing',
  ogDescription: description,
  ogUrl: url,
})
useHead({ link: [{ rel: 'canonical', href: url }] })
</script>

<template>
  <main id="content" class="shell">
    <WritingSection page />
  </main>
  <SiteFooter />
</template>

<style scoped>
.shell {
  padding-top: 48px;
}
</style>
