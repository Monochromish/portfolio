import type { AsyncComponentLoader } from 'vue'

export interface Post {
  slug: string
  title: string
  // calendar day, YYYY-MM-DD
  date: string
  summary: string
}

export const posts: Post[] = []

export const postBodies: Record<string, AsyncComponentLoader> = {}

export const latestPosts = () => [...posts].sort((a, b) => b.date.localeCompare(a.date))

export const findPost = (slug: string) => posts.find(p => p.slug === slug)

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export const postDate = (date: string, style: 'short' | 'long' = 'short') =>
  (style === 'long' ? longDate : shortDate).format(new Date(`${date}T00:00:00Z`))
