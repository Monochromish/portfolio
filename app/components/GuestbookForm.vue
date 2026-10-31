<script setup lang="ts">
import { GUESTBOOK_TURNSTILE_ACTION, STICKER_TEMPLATES, stickerProblem, stickerTemplate } from '#shared/guestbook'
import type { GuestbookReceipt, GuestbookRejection, Placement, Sticker, StickerStroke, StickerSubmission } from '#shared/types'
import type { StickerDraft } from './StickerBoard.vue'

defineProps<{ left: boolean, placing?: boolean }>()
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
  if (!formToken) refreshToken().catch(() => {})
}

function onRadioKey(e: KeyboardEvent, index: number, count: number, choose: (i: number) => void) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  const to = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : step ? (index + step + count) % count : -1
  if (to < 0) return
  e.preventDefault()
  choose(to)
  const button = (e.currentTarget as HTMLElement).parentElement?.children[to]
  if (button instanceof HTMLElement) button.focus()
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
  if (reason === 'form-token' || reason === 'form-expired') await refreshToken().catch(() => {})
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
  emit('place', { template: t.id, strokes })
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
    emit('sent', { id: receipt.id, template: t.id, strokes, createdAt: Date.now(), ...place, country: receipt.country })
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

defineExpose({ post, back: () => submit.value?.focus() })
</script>

<template>
  <div class="guestbook-form" :data-input="input" @keydown.capture="input = 'keyboard'" @pointerdown.capture="input = 'pointer'">
    <p v-if="left" ref="noticeLine" class="notice" role="status" tabindex="-1">
      <span class="i-site-check" aria-hidden="true" />
      {{ notice || MESSAGES['one-per-visitor'] }}
    </p>
    <template v-else>
      <p v-if="notice && !template" ref="noticeLine" class="notice" role="status" tabindex="-1">
        <span class="i-site-check" aria-hidden="true" />
        {{ notice }}
      </p>

      <form
        v-if="template"
        class="editor"
        novalidate
        :inert="placing"
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

        <div class="tools">
          <div class="inks" role="radiogroup" aria-label="Ink">
            <button
              v-for="(ink, i) in template.inks"
              :key="ink.hex"
              type="button"
              role="radio"
              class="ink"
              :aria-checked="drawing.color === i"
              :aria-label="ink.name"
              :title="ink.name"
              :tabindex="drawing.color === i ? 0 : -1"
              @click="setColor(i)"
              @keydown="onRadioKey($event, i, template.inks.length, setColor)"
            >
              <span class="swatch" :style="{ background: ink.hex }" />
            </button>
          </div>
          <div class="sizes" role="radiogroup" aria-label="Brush">
            <button
              v-for="(name, i) in ['Fine', 'Bold']"
              :key="name"
              type="button"
              role="radio"
              class="size"
              :aria-checked="drawing.size === i"
              :tabindex="drawing.size === i ? 0 : -1"
              @click="setSize(i)"
              @keydown="onRadioKey($event, i, 2, setSize)"
            >
              <span class="dot" :class="i ? 'bold' : 'fine'" :style="{ background: template.inks[drawing.color]!.hex }" aria-hidden="true" />
              {{ name }}
            </button>
          </div>
          <div class="edits">
            <button type="button" class="quiet" :aria-disabled="drawing.history.length ? undefined : 'true'" @click="undo">Undo</button>
            <button type="button" class="quiet" :aria-disabled="drawing.strokes.length ? undefined : 'true'" @click="clear">Clear</button>
          </div>
        </div>

        <div class="trap" aria-hidden="true">
          <label for="gb-website">Website</label>
          <input id="gb-website" v-model="website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>

        <div class="actions">
          <button ref="submit" type="submit" class="submit">
            Put it on the board
          </button>
          <p v-if="formError" ref="errorLine" class="error" role="alert">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="6.6" /><path d="M10 6.7v3.8M10 13.3h.01" /></svg>
            {{ formError }}
          </p>
        </div>
      </form>
    </template>
    <div v-if="siteKey" ref="challengeSlot" class="challenge" />
  </div>
</template>

<style scoped>
.size::before,
.quiet::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  opacity: 0;
  transition: opacity 150ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .size:not([aria-checked='true']):hover::before,
  .quiet:not([aria-disabled='true']):hover::before {
    opacity: 1;
  }
}
.notice {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 18px 0 0;
  font-size: 15px;
  color: var(--ink);
}
.notice span {
  flex: none;
  margin-top: 3px;
  font-size: 17px;
  color: var(--accent);
}
.notice:focus-visible {
  outline-offset: 4px;
}
/* keeps it clear of the fixed header */
.notice {
  scroll-margin-top: 112px;
}
.editor {
  display: flex;
  flex-direction: column;
  margin-top: 28px;
  transition: opacity 150ms ease;
}
.editor[inert] {
  opacity: 0.45;
}
.hint {
  margin: 10px 0 0;
  text-align: center;
}
.tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 18px;
  margin-top: 14px;
}
.inks,
.sizes,
.edits {
  display: flex;
  align-items: center;
  gap: 2px;
}
.ink {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 160ms var(--ease-out);
}
.ink:active {
  transform: scale(0.95);
}
.swatch {
  width: 24px;
  height: 24px;
  border-radius: 999px;
}
/* half ink: at least 3:1 on the paper in both themes */
.swatch,
.dot {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 50%, transparent);
}
.ink[aria-checked='true'] .swatch {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 50%, transparent), 0 0 0 3px var(--paper), 0 0 0 5px var(--ink);
}
.size,
.quiet {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 550;
  color: var(--ink-2);
  cursor: pointer;
  transition: transform 160ms var(--ease-out);
}
.size[aria-checked='true'] {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  color: var(--ink);
}
.size:active,
.quiet:active {
  transform: scale(0.97);
}
.quiet[aria-disabled='true'] {
  color: var(--ink-3);
  opacity: 0.6;
  cursor: default;
}
.quiet[aria-disabled='true']:active {
  transform: none;
}
.dot {
  flex: none;
  border-radius: 999px;
}
.dot.fine {
  width: 6px;
  height: 6px;
}
.dot.bold {
  width: 12px;
  height: 12px;
}
.trap {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.challenge :deep(iframe) {
  margin-top: 18px;
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
  padding: 0 20px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease, transform 160ms var(--ease-out);
}
.submit:active {
  transform: scale(0.97);
}
@media (hover: hover) and (pointer: fine) {
  .submit:hover {
    background: color-mix(in srgb, var(--accent) 86%, var(--ink));
  }
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
.error svg {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 0.5px;
}
</style>
