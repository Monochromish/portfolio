<script setup lang="ts">
import { GUESTBOOK_TURNSTILE_ACTION, STICKER_TEMPLATES, stickerProblem, stickerTemplate } from '#shared/guestbook'
import type { GuestbookReceipt, GuestbookRejection, Placement, Sticker, StickerStroke, StickerSubmission } from '#shared/types'
import type { StickerDraft } from './StickerBoard.vue'

defineProps<{ left: boolean, placing?: boolean, centred?: boolean }>()
const emit = defineEmits<{ sent: [sticker: Sticker], left: [], place: [draft: StickerDraft] }>()

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

interface Drawing {
  strokes: StickerStroke[]
  history: StickerStroke[][]
  color: number
  size: number
}

interface Waiter {
  resolve: (token: string) => void
  reject: (err: Error) => void
}

// the server refuses tokens younger than 3 s or older than an hour
const TOKEN_MIN_AGE_MS = 3200
const TOKEN_MAX_AGE_MS = 50 * 60 * 1000
const CHALLENGE_TIMEOUT_MS = 20_000

const MESSAGES: Record<GuestbookRejection, string> = {
  'too-large': 'That is more drawing than one sticker can hold. Undo a few strokes and try again.',
  'bad-request': 'That could not be sent. Reload the page and try again.',
  'honeypot': 'That could not be sent. Reload the page and try again.',
  'form-token': 'The page had been open a while. It is ready again, so try once more.',
  'too-fast': 'That was quick. Try again in a second.',
  'form-expired': 'The page had been open a while. It is ready again, so try once more.',
  'rate-limited': 'That is a lot of stickers at once. Try again in a minute.',
  'daily-cap': 'Someone on your network already left one today. Try again tomorrow.',
  'turnstile': 'The spam check did not pass. Try again.',
  'invalid-sticker': 'This drawing could not be sent as it is. Undo the last stroke and try again.',
  'one-per-visitor': 'Your sticker’s already in. Thanks for stopping by.',
  'book-full': 'The book’s full right now. Check back soon.',
}

const CHALLENGE_MESSAGES: Record<string, string> = {
  'challenge-blocked': 'The spam check could not load. Allow challenges.cloudflare.com and try again.',
  'challenge-failed': MESSAGES.turnstile,
  'challenge-timeout': 'The spam check is taking a while. Try again in a moment.',
}

const siteKey = String(useRuntimeConfig().public.turnstileSiteKey || '')

const picked = ref<string | null>(STICKER_TEMPLATES[0]!.id)
const drawings = shallowRef<Record<string, Drawing>>({})
const website = ref('')
const sending = ref(false)
const formError = ref('')
const notice = ref('')
const full = ref(false)
const input = ref<'pointer' | 'keyboard'>('pointer')

const challengeSlot = ref<HTMLElement>()
const pad = ref<HTMLDialogElement>()
const submit = ref<HTMLButtonElement>()
const noticeLine = ref<HTMLElement>()
const errorLine = ref<HTMLElement>()

async function showError(message: string) {
  formError.value = message
  await nextTick()
  errorLine.value?.scrollIntoView({ block: 'nearest' })
}

const template = computed(() => picked.value ? stickerTemplate(picked.value)! : null)
const blank = (): Drawing => ({ strokes: [], history: [], color: 0, size: 0 })
const drawing = computed(() => picked.value ? drawings.value[picked.value] ?? blank() : blank())

function update(id: string, change: Partial<Drawing>) {
  drawings.value = { ...drawings.value, [id]: { ...(drawings.value[id] ?? blank()), ...change } }
}

let formToken = ''
let tokenAt = 0

async function refreshToken() {
  const res = await $fetch<{ token: string }>('/api/guestbook/token')
  formToken = res.token
  tokenAt = Date.now()
}

function warm() {
  loadChallenge()
  // post() fetches the token again when this fails, and reports the failure there
  if (!formToken) refreshToken().catch(() => {})
}

const setColor = (color: number) => picked.value && update(picked.value, { color })
const setSize = (size: number) => picked.value && update(picked.value, { size })

function addStroke(stroke: StickerStroke) {
  const id = picked.value
  if (!id) return
  const d = drawings.value[id] ?? blank()
  update(id, { strokes: [...d.strokes, stroke], history: [...d.history, d.strokes] })
  formError.value = ''
}

function undo() {
  const id = picked.value
  const d = id ? drawings.value[id] : undefined
  if (!id || !d?.history.length) return
  update(id, { strokes: d.history.at(-1)!, history: d.history.slice(0, -1) })
  full.value = false
}

function clear() {
  const id = picked.value
  const d = id ? drawings.value[id] : undefined
  if (!id || !d?.strokes.length) return
  update(id, { strokes: [], history: [...d.history, d.strokes] })
  full.value = false
}

function onEditorKey(e: KeyboardEvent) {
  if (e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
    e.preventDefault()
    undo()
  }
}

let turnstile: Turnstile | undefined
let widgetId: string | undefined
let challengeToken = ''
let challengeFailed = false
let scriptRequested = false
const waiting: Waiter[] = []

function failChallenge(reason: string) {
  for (const w of waiting.splice(0)) w.reject(new Error(reason))
}

function loadChallenge() {
  if (!siteKey || scriptRequested) return
  scriptRequested = true
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  script.async = true
  script.onload = renderChallenge
  script.onerror = () => {
    script.remove()
    scriptRequested = false
    failChallenge('challenge-blocked')
  }
  document.head.append(script)
}

function renderChallenge() {
  turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile
  if (!turnstile || !challengeSlot.value) return
  widgetId = turnstile.render(challengeSlot.value, {
    'sitekey': siteKey,
    'action': GUESTBOOK_TURNSTILE_ACTION,
    'appearance': 'interaction-only',
    'theme': document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    'callback': (token: string) => {
      challengeToken = token
      challengeFailed = false
      for (const w of waiting.splice(0)) w.resolve(token)
    },
    'expired-callback': () => {
      challengeToken = ''
    },
    'error-callback': () => {
      challengeToken = ''
      challengeFailed = true
      failChallenge('challenge-failed')
    },
  })
}

function passChallenge() {
  if (challengeToken) return Promise.resolve(challengeToken)
  return new Promise<string>((resolve, reject) => {
    const w: Waiter = {
      resolve: (token) => {
        clearTimeout(timer)
        resolve(token)
      },
      reject: (err) => {
        clearTimeout(timer)
        reject(err)
      },
    }
    const timer = setTimeout(() => {
      waiting.splice(waiting.indexOf(w), 1)
      reject(new Error('challenge-timeout'))
    }, CHALLENGE_TIMEOUT_MS)
    waiting.push(w)
    loadChallenge()
    if (challengeFailed) resetChallenge()
  })
}

function resetChallenge() {
  challengeToken = ''
  challengeFailed = false
  if (turnstile && widgetId) turnstile.reset(widgetId)
}

onBeforeUnmount(() => {
  if (turnstile && widgetId) turnstile.remove(widgetId)
})

const reasonOf = (err: unknown) => (err as { data?: { data?: { reason?: GuestbookRejection } } }).data?.data?.reason

async function explain(err: unknown) {
  const challenge = err instanceof Error ? CHALLENGE_MESSAGES[err.message] : undefined
  if (challenge) return challenge
  const reason = reasonOf(err)
  if (reason === 'one-per-visitor') {
    picked.value = null
    notice.value = MESSAGES[reason]
    emit('left')
    return null
  }
  if (reason === 'form-token' || reason === 'form-expired') formToken = ''
  if (reason) return MESSAGES[reason]
  const status = (err as { statusCode?: number }).statusCode
  return status
    ? 'The sticker book is not taking stickers right now. Try again later.'
    : 'Could not reach the site. Check your connection and try again.'
}

async function ready() {
  const t = template.value
  if (!t) return
  formError.value = ''
  const strokes = drawing.value.strokes
  if (!strokes.length) {
    await showError('Draw something on the sticker first.')
    return
  }
  if (stickerProblem(t, strokes)) {
    await showError(MESSAGES['invalid-sticker'])
    return
  }
  warm()
  pad.value?.close()
  emit('place', { template: t.id, strokes })
}

// the pad opens as a dialog that grows out of whatever opened it
function open(from?: DOMRect) {
  const el = pad.value
  if (!el || el.open) return
  el.showModal()
  const box = el.getBoundingClientRect()
  el.style.setProperty('--from-x', from ? `${from.left + from.width / 2 - box.left}px` : '50%')
  el.style.setProperty('--from-y', from ? `${from.top + from.height / 2 - box.top}px` : '100%')
  warm()
}

// a click on the dimmed page behind closes it, as Escape does
function onBackdrop(e: MouseEvent) {
  const el = pad.value
  if (!el || e.target !== el) return
  const b = el.getBoundingClientRect()
  if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) el.close()
}

async function post(place: Placement, shareCountry: boolean): Promise<string | null> {
  const t = template.value
  if (sending.value || !t) return null
  const strokes = drawing.value.strokes
  sending.value = true
  try {
    if (!formToken || Date.now() - tokenAt > TOKEN_MAX_AGE_MS) await refreshToken()
    const wait = tokenAt + TOKEN_MIN_AGE_MS - Date.now()
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
    const submission: StickerSubmission = { template: t.id, strokes, ...place, shareCountry, website: website.value, formToken }
    if (siteKey) submission.turnstileToken = await passChallenge()
    const receipt = await $fetch<GuestbookReceipt>('/api/guestbook', { method: 'POST', body: submission })
    emit('sent', { id: receipt.id, template: t.id, strokes, createdAt: Date.now(), ...place, x: receipt.x, y: receipt.y, country: receipt.country })
    update(t.id, blank())
    picked.value = null
    notice.value = 'Stuck on. Everyone will see it soon.'
    await nextTick()
    noticeLine.value?.focus({ preventScroll: true })
    return null
  }
  catch (err) {
    return await explain(err)
  }
  finally {
    sending.value = false
    if (siteKey) resetChallenge()
  }
}

// back: placing was cancelled, so the pad returns with the drawing still on it
defineExpose({
  post,
  open,
  back: () => {
    open()
    submit.value?.focus()
  },
})
</script>

<template>
  <div class="guestbook-form" :data-input="input" @keydown.capture="input = 'keyboard'" @pointerdown.capture="input = 'pointer'">
    <p v-if="left" ref="noticeLine" class="notice" :class="{ centred }" role="status" tabindex="-1">
      <span class="i-site-check check" aria-hidden="true" />
      {{ notice || MESSAGES['one-per-visitor'] }}
    </p>
    <template v-else>
      <p v-if="notice && !template" ref="noticeLine" class="notice" :class="{ centred }" role="status" tabindex="-1">
        <span class="i-site-check check" aria-hidden="true" />
        {{ notice }}
      </p>

      <dialog v-if="template" ref="pad" class="pad-dialog" aria-labelledby="pad-title" @click="onBackdrop">
      <h2 id="pad-title" class="pad-title">Leave a sticker</h2>
      <p class="pad-note">Doodle on the sticker, then stick it anywhere on the board.</p>
      <form
        class="editor"
        novalidate
        :aria-label="`Draw on the ${template.label}`"
        :aria-busy="sending"
        @submit.prevent="ready"
        @keydown="onEditorKey"
        @focusin="warm"
        @pointerdown="warm"
      >
        <StickerPad
          :key="template.id"
          :template="template.id"
          :strokes="drawing.strokes"
          :color="drawing.color"
          :size="drawing.size"
          :locked="sending || placing"
          @stroke="addStroke"
          @full="full = true"
        />
        <p class="hint meta">
          {{ full ? 'This sticker is full. Undo a few strokes to keep drawing.' : 'Draw with a mouse, finger or pen.' }}
        </p>

        <GuestbookFormTools
          :inks="template.inks"
          :color="drawing.color"
          :size="drawing.size"
          :can-undo="!!drawing.history.length"
          :can-clear="!!drawing.strokes.length"
          @color="setColor"
          @size="setSize"
          @undo="undo"
          @clear="clear"
        />

        <div class="trap" aria-hidden="true">
          <label for="gb-website">Website</label>
          <input id="gb-website" v-model="website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>

        <div class="actions">
          <GuestbookFormPill @click="pad?.close()">
            Cancel
          </GuestbookFormPill>
          <button ref="submit" type="submit" class="submit">
            Put it on the board
          </button>
          <p v-if="formError" ref="errorLine" class="error" role="alert">
            <svg class="error-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.6" /><path d="M10 6.7v3.8M10 13.3h.01" /></svg>
            {{ formError }}
          </p>
        </div>
      </form>
      </dialog>
    </template>
    <div v-if="siteKey" ref="challengeSlot" class="challenge" />
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 18px 0 0;
  /* keeps it clear of the fixed header */
  scroll-margin-top: 112px;
  font-size: 15px;
  color: var(--ink);
}

/* the notice a visitor gets once theirs is in sits centred under the slot it filled */
.notice.centred {
  justify-content: center;
  margin: 0;
}

.notice:focus-visible {
  outline-offset: 4px;
}

.check {
  flex: none;
  margin-top: 3px;
  font-size: 17px;
}

/* 24 px corners and 16 px of padding: the pad inside takes what is left of the corner */
/* the reset takes a dialog's own centring margin away */
.pad-dialog {
  margin: auto;
  width: min(30rem, calc(100vw - 2 * var(--s4)));
  max-height: calc(100dvh - 2 * var(--s4));
  padding: var(--s4);
  border-radius: var(--r4);
  background: var(--surface);
  box-shadow:
    var(--edge),
    0 24px 64px -16px oklch(0% 0 0 / 0.5);
  color: var(--ink-2);
  /* open() sets the origin to the button that opened it */
  transform-origin: var(--from-x, 50%) var(--from-y, 100%);
  opacity: 0;
  scale: 0.96;
  transition:
    opacity 180ms ease,
    scale 220ms var(--ease-out),
    overlay 220ms allow-discrete,
    display 220ms allow-discrete;
}

.pad-dialog[open] {
  opacity: 1;
  scale: 1;
}

@starting-style {
  .pad-dialog[open] {
    opacity: 0;
    scale: 0.96;
  }
}

.pad-dialog::backdrop {
  background: oklch(0% 0 0 / 0);
  transition:
    background-color 220ms ease,
    overlay 220ms allow-discrete,
    display 220ms allow-discrete;
}

.pad-dialog[open]::backdrop {
  background: oklch(0% 0 0 / 0.55);
}

@starting-style {
  .pad-dialog[open]::backdrop {
    background: oklch(0% 0 0 / 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pad-dialog,
  .pad-dialog::backdrop {
    transition: none;
  }
}

.pad-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ink);
}

.pad-note {
  margin: 2px 0 0;
  font-size: var(--t-small);
  line-height: 1.45;
  color: var(--ink-3);
}

.editor {
  display: flex;
  flex-direction: column;
  margin-top: var(--s3);
}

.hint {
  margin: 10px 0 0;
  text-align: center;
}

.trap {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 16px;
  margin-top: 16px;
}

.submit {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: var(--r2);
  background: var(--ink);
  box-shadow: var(--edge-ink);
  color: var(--paper);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-radius 200ms var(--ease-out),
    transform 160ms var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .submit:hover {
    border-radius: var(--r3);
    background: var(--ink-2);
  }
}

.submit:active {
  transform: scale(0.97);
}

.error {
  scroll-margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-basis: 100%;
  justify-content: center;
  margin: 0;
  font-size: 14px;
  font-weight: 550;
  line-height: 1.45;
  color: var(--ink);
  text-align: center;
}

.error-icon {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 0.5px;
}

.challenge :deep(iframe) {
  margin-top: 18px;
}
</style>
