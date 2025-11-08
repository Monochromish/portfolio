<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-8 py-24 space-y-20">

    <div class="text-center max-w-2xl space-y-4">
      <h1 class="text-5xl font-bold tracking-tight">
        Hey! I'm Himanshu 👋
      </h1>

      <p class="text-xl text-gray-400">
        Freelance Software Dev • Computer Science Sophomore @ Penn State
      </p>

      <p class="text-gray-200 leading-relaxed">
        Welcome to my page. I build software and interfaces that feel good to use and are easy to maintain.
        I care about snappiness, simplicity, and design that looks modern without getting in the way.
        You’ll find my projects, writing, and contact info below.
      </p>

      <div class="flex justify-center gap-4 pt-6">
        <SocialIcon href="https://github.com/Monochromish" icon="ri:github-line" label="GitHub"  />
        <SocialIcon href="https://www.linkedin.com/in/himanshu-adwani/" icon="ri:linkedin-box-line" label="LinkedIn" />
        <SocialIcon href="mailto:himanshu.adwani@outlook.com" icon="ph:envelope" label="Email" />
        <SocialIcon href="/resume.pdf" icon="mdi:file-document-outline" label="Resume" />
      </div>
    </div>

    <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card
          to="https://github.com/ciderapp/cider-chromecast/"
          icon="ri:cast-line"
          title="Cider Chromecast Integration"
          subtitle="Go, C"
          description="A lightweight library and CLI for streaming audio to Chromecast devices."
        />
        <Card
          to="https://github.com/Monochromish/portfolio"
          icon="ri:planet-line"
          title="himanshu.sh"
          subtitle="Vue, TypeScript"
          description="A personal landing page that highlights my side projects, and ways to get in touch. Built with Nuxt.js."
        />
        <Card
          to="https://github.com/Monochromish/Kalopsia-Bot"
          icon="ri:poker-spades-line"
          title="Kalopsia Bot"
          subtitle="JavaScript"
          description="Entertainment-focused community bot with 100+ GitHub stars, built to enhance engagement."
        />
    </div>
  </div>
</template>