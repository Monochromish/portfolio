<script setup lang="ts">
const site = 'https://himanshu.sh'
const { alias, name } = useIdentity()
const origin = alias ? useRequestURL().origin : site
const description = `${alias ? 'Monochromish (Himanshu Adwani)' : 'Himanshu Adwani (Isaiah)'}: senior lead developer at Cider, computer science at Penn State, looking for a Summer 2027 software engineering internship.`
const ogImage = `${origin}/og.png`
const ogAlt = 'A pixel lagoon seen from above with manta rays'
const avatar = 'https://avatars.githubusercontent.com/u/79590499?v=4'

useSeoMeta({
  title: name,
  description,
  ogTitle: name,
  ogDescription: description,
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: ogAlt,
  ogType: 'website',
  ogUrl: origin,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: site }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      'name': 'Himanshu Adwani',
      'alternateName': ['Isaiah', 'Monochromish'],
      'url': site,
      'image': avatar,
      'jobTitle': 'Senior Lead Developer',
      'worksFor': { '@type': 'Organization', 'name': 'Cider Collective', 'url': 'https://cider.sh' },
      'affiliation': { '@type': 'CollegeOrUniversity', 'name': 'The Pennsylvania State University' },
      'sameAs': [
        'https://github.com/Monochromish',
        'https://www.linkedin.com/in/himanshu-adwani',
        'https://app.joinhandshake.com/profiles/8shxru',
      ],
    }),
  }],
})

// a Discord component embed (docs.discord.com: Link previews, Component embeds)
const embed = JSON.stringify({
  component: {
    // container > text > gallery (the lagoon) > row of link buttons
    type: 17,
    accent_color: 0x57B9BF,
    spoiler: false,
    components: [
      { type: 10, content: `# ${name}\nSenior lead developer at Cider, the Apple Music client. Computer science at Penn State.` },
      { type: 12, items: [{ media: { url: ogImage }, description: ogAlt }] },
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: 'Resume', url: `${site}/Himanshu_Adwani_Resume.pdf` },
          { type: 2, style: 5, label: 'GitHub', url: 'https://github.com/Monochromish' },
          { type: 2, style: 5, label: 'LinkedIn', url: 'https://www.linkedin.com/in/himanshu-adwani' },
        ],
      },
    ],
  },
})
const route = useRoute()
useHead(() => route.path === '/'
  ? { script: [{ id: 'discord:component-embed', type: 'application/json', innerHTML: embed }] }
  : {})

useToolbarTint()
</script>

<template>
  <a class="skip" href="#content">Skip to content</a>
  <NuxtRouteAnnouncer />
  <SiteHeader />
  <NuxtPage />
</template>

<style>
.skip {
  position: fixed;
  left: 12px;
  top: -60px;
  z-index: 50;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--ink);
  color: var(--paper);
  text-decoration: none;
}
.skip:focus-visible {
  top: 12px;
}
</style>
