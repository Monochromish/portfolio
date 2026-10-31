import { defineEventHandler, sendRedirect } from 'nuxt/server'
import { isAliasHost } from '#shared/hosts'

export default defineEventHandler((event) => {
  if (!isAliasHost(new URL(requestOrigin(event)).hostname)) return
  const { pathname, search } = event.url
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/auth/')) {
    return sendRedirect(event, `${serverConfig(event).public.siteUrl}${pathname}${search}`, 302)
  }
})
