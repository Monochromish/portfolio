# himanshu.sh / monochromish.com / monochromi.sh

This is a Nuxt app that runs on one of those domains.

## Stack

- [Nuxt 4](https://nuxt.com) with Vue 3.5, server-rendered, deployed to Cloudflare Workers.
- [UnoCSS](https://unocss.dev) (Wind4 preset) for utilities, with a hand-drawn icon set inlined in `uno.config.ts`.
- Cloudflare D1 through Nitro's built-in `useDatabase()` for the sticker book; Node's built-in SQLite in development.
- [Bun](https://bun.sh) as the package manager.
