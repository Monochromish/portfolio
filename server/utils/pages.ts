import type { H3Event } from 'h3'

// neither page holds anything about the visitor, so one rendering serves everyone and the live parts fill in after it loads.
// the home page changes only when the site is deployed; the sticker page also changes when a sticker is approved
const KEEP_S: Record<string, number> = { '/': 60 * 60 * 24, '/stickers': 60 }

export function pageKey(event: H3Event) {
  const { commit } = useRuntimeConfig(event).public
  const url = getRequestURL(event)
  const keep = KEEP_S[url.pathname]
  // a deploy changes the key, so a visitor never gets a page whose scripts the deploy removed
  if (event.method !== 'GET' || url.search || !keep || !commit || typeof caches === 'undefined') return null
  return { url: `https://${url.host}/_page/${commit}${url.pathname}`, keep }
}
