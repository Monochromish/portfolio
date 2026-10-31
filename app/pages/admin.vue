<script setup lang="ts">
import { stickerProblem, stickerTemplate } from '#shared/guestbook'
import type { GuestbookQueue, ModerationSticker } from '#shared/types'

useSeoMeta({
  title: 'Moderation · Himanshu Adwani',
  robots: 'noindex, nofollow',
})

type View = 'loading' | 'signed-out' | 'not-configured' | 'failed' | 'ready'
type Action = 'approve' | 'reject'

const view = ref<View>('loading')
const pending = ref<ModerationSticker[]>([])
const next = ref<number | null>(null)
const loadingMore = ref(false)
const moreError = ref(false)
const recent = ref<ModerationSticker[]>([])
const busy = ref<Record<number, Action>>({})
const rowError = ref<Record<number, string>>({})
const signingOut = ref(false)
const signOutError = ref('')

const when = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const statusOf = (err: unknown) => (err as { statusCode?: number }).statusCode

const drawable = (s: ModerationSticker) => {
  const t = stickerTemplate(s.template)
  return !!t && !stickerProblem(t, s.strokes)
}

function without<T>(record: Record<number, T>, id: number) {
  const next = { ...record }
  delete next[id]
  return next
}

async function load() {
  try {
    const queue = await $fetch<GuestbookQueue>('/api/admin/guestbook')
    pending.value = queue.pending.filter(drawable)
    next.value = queue.next
    recent.value = queue.recent.filter(drawable)
    view.value = 'ready'
  }
  catch (err) {
    const status = statusOf(err)
    view.value = status === 401 ? 'signed-out' : status === 503 ? 'not-configured' : 'failed'
  }
}

async function loadMore() {
  if (loadingMore.value || next.value === null) return
  loadingMore.value = true
  moreError.value = false
  try {
    const queue = await $fetch<GuestbookQueue>('/api/admin/guestbook', { query: { after: next.value } })
    const seen = new Set(pending.value.map(s => s.id))
    pending.value = [...pending.value, ...queue.pending.filter(s => drawable(s) && !seen.has(s.id))]
    next.value = queue.next
  }
  catch (err) {
    if (statusOf(err) === 401) view.value = 'signed-out'
    else moreError.value = true
  }
  finally {
    loadingMore.value = false
  }
}

async function decide(sticker: ModerationSticker, action: Action) {
  if (busy.value[sticker.id]) return
  busy.value = { ...busy.value, [sticker.id]: action }
  rowError.value = without(rowError.value, sticker.id)
  try {
    const updated = await $fetch<ModerationSticker>(`/api/admin/guestbook/${sticker.id}`, { method: 'POST', body: { action } })
    pending.value = pending.value.filter(s => s.id !== sticker.id)
    recent.value = [updated, ...recent.value.filter(s => s.id !== sticker.id)]
    if (!pending.value.length) loadMore()
  }
  catch (err) {
    if (statusOf(err) === 401) view.value = 'signed-out'
    else rowError.value = { ...rowError.value, [sticker.id]: 'That did not save. Try again.' }
  }
  finally {
    busy.value = without(busy.value, sticker.id)
  }
}

async function signOut() {
  if (signingOut.value) return
  signingOut.value = true
  signOutError.value = ''
  try {
    await $fetch('/auth/logout', { method: 'POST' })
    pending.value = []
    next.value = null
    recent.value = []
    view.value = 'signed-out'
  }
  catch {
    signOutError.value = 'Sign out did not go through. Try again.'
  }
  finally {
    signingOut.value = false
  }
}

onMounted(load)
</script>

<template>
  <main id="content" class="shell">
    <div class="wrap">
      <StickerDefs />
      <div class="top">
        <h1>Sticker moderation</h1>
        <button v-if="view === 'ready'" type="button" class="quiet-button" :aria-disabled="signingOut ? 'true' : undefined" @click="signOut">
          <span class="i-site-log-out" aria-hidden="true" />
          Sign out
        </button>
      </div>
      <p v-if="signOutError" class="note" role="alert">{{ signOutError }}</p>

      <a v-if="view === 'signed-out'" class="primary" href="/auth/github">
        <span class="i-site-github" aria-hidden="true" />
        Sign in with GitHub
      </a>
      <p v-else-if="view === 'not-configured'" class="note">
        Owner sign-in is not set up on this server yet. The steps are in docs/setup.md.
      </p>
      <p v-else-if="view === 'failed'" class="note">
        The queue did not load. Reload the page to try again.
      </p>

      <template v-else-if="view === 'ready'">
        <section class="group" aria-labelledby="queue-title">
          <h2 id="queue-title">
            Waiting for review
            <span class="meta">{{ pending.length }}{{ next === null ? '' : '+' }}</span>
          </h2>
          <p class="note lead">Each sticker is drawn the way the book would show it. Oldest first.</p>
          <StickerBook v-if="pending.length" class="queue" :stickers="pending">
            <template #default="{ sticker }">
              <p class="meta when">
                #{{ sticker.id }} · <time :datetime="new Date(sticker.createdAt).toISOString()">{{ when.format(sticker.createdAt) }}</time>
              </p>
              <div class="actions">
                <button type="button" class="approve" :aria-disabled="busy[sticker.id] ? 'true' : undefined" @click="decide(sticker, 'approve')">
                  <span class="i-site-check" aria-hidden="true" />
                  {{ busy[sticker.id] === 'approve' ? 'Approving' : 'Approve' }}
                </button>
                <button type="button" class="reject" :aria-disabled="busy[sticker.id] ? 'true' : undefined" @click="decide(sticker, 'reject')">
                  <span class="i-site-close" aria-hidden="true" />
                  {{ busy[sticker.id] === 'reject' ? 'Rejecting' : 'Reject' }}
                </button>
              </div>
              <p v-if="rowError[sticker.id]" class="meta row-error" role="alert">{{ rowError[sticker.id] }}</p>
            </template>
          </StickerBook>
          <p v-else-if="next === null" class="note">Nothing waiting. Every sticker has been looked at.</p>
          <p v-if="next !== null" class="more">
            <button type="button" class="quiet-button" :aria-disabled="loadingMore ? 'true' : undefined" @click="loadMore">
              {{ loadingMore ? 'Loading' : 'Show more' }}
            </button>
            <span v-if="moreError" class="note" role="alert">That did not load. Try again.</span>
          </p>
        </section>

        <section v-if="recent.length" class="group" aria-labelledby="recent-title">
          <h2 id="recent-title">Recent decisions</h2>
          <StickerBook class="queue" :stickers="recent">
            <template #default="{ sticker }">
              <p class="meta when decision">
                <span :class="sticker.status === 'approved' ? 'i-site-check' : 'i-site-close'" aria-hidden="true" />
                {{ sticker.status === 'approved' ? 'Approved' : 'Rejected' }} · #{{ sticker.id }}
              </p>
              <button
                type="button"
                class="flip"
                :aria-disabled="busy[sticker.id] ? 'true' : undefined"
                @click="decide(sticker, sticker.status === 'approved' ? 'reject' : 'approve')"
              >
                {{ sticker.status === 'approved' ? 'Take it down' : 'Approve instead' }}
              </button>
              <p v-if="rowError[sticker.id]" class="meta row-error" role="alert">{{ rowError[sticker.id] }}</p>
            </template>
          </StickerBook>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.shell {
  padding: 48px 0 128px;
}
.wrap {
  max-width: 52rem;
  margin: 0 auto;
  padding: 104px 24px 0;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
h2 {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.012em;
}
.more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin: 20px 0 0;
}
.group + .group {
  margin-top: 64px;
}
.note {
  margin: 0;
  color: var(--ink-2);
}
.lead {
  margin-bottom: 18px;
  font-size: 15px;
  color: var(--ink-3);
}
/* the same page the public board uses */
.wrap .queue {
  gap: 28px 24px;
  padding: 26px 14px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background-color: var(--surface);
  background-image: radial-gradient(circle at 1px 1px, var(--line-strong) 1px, transparent 1.4px);
  background-size: 18px 18px;
}
.when {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 10px 0 0;
}
.decision span {
  font-size: 16px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
.approve,
.reject,
.primary,
.quiet-button,
.flip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, transform 160ms var(--ease-out);
}
.approve,
.primary {
  padding: 0 16px 0 13px;
  background: var(--ink);
  color: var(--paper);
}
.primary {
  padding: 0 20px 0 16px;
}
.reject,
.flip {
  border: 1px solid var(--line-strong);
  color: var(--ink);
}
.reject {
  padding: 0 16px 0 13px;
}
.quiet-button {
  padding: 0 12px;
  color: var(--ink-2);
  font-weight: 550;
}
.flip {
  margin-top: 8px;
  padding: 0 16px;
  font-weight: 550;
}
.approve span,
.reject span,
.primary span,
.quiet-button span {
  font-size: 18px;
}
:is(.approve, .reject, .primary, .quiet-button, .flip):active {
  transform: scale(0.97);
}
[aria-disabled='true'] {
  cursor: progress;
  opacity: 0.6;
}
@media (hover: hover) and (pointer: fine) {
  .approve:hover,
  .primary:hover {
    background: color-mix(in srgb, var(--ink) 86%, var(--paper));
  }
  .reject:hover,
  .flip:hover,
  .quiet-button:hover {
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }
}
.row-error {
  margin: 6px 0 0;
  color: var(--ink);
}
@media (max-width: 640px) {
  .shell {
    padding-bottom: 96px;
  }
  .wrap {
    padding: 72px 20px 0;
  }
  h1 {
    font-size: 24px;
  }
}
</style>
