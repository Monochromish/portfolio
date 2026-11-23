<script setup lang="ts">
import { stickerProblem, stickerTemplate } from '#shared/guestbook'
import type { ComponentPublicInstance } from 'vue'
import type { OwnSticker, Placement, Sticker, StickerPage } from '#shared/types'
import type { BoardSticker, StickerDraft } from './StickerBoard.vue'

// overlay: no section of its own; the pad and then the board open over whatever page it is on.
// asked counts the presses that ask for the pad, and from is the button the latest one came from
const props = defineProps<{ page?: boolean, overlay?: boolean, asked?: number, from?: DOMRect }>()

// the board shows the newest 24 stickers, the most the API sends at once
const LIMIT = 24

// on the home page the board is far below the first screen, so it loads after the page and does not hold it up
const wait = { server: !!props.page, lazy: !props.page }

const { data, error, status } = await useFetch<StickerPage>('/api/guestbook', {
  key: 'guestbook-board',
  query: { limit: LIMIT },
  default: () => ({ stickers: [], total: 0, next: null }),
  ...wait,
})

const { data: own, refresh: refreshOwn, status: ownStatus } = await useFetch<OwnSticker>('/api/guestbook/mine', {
  key: 'guestbook-mine',
  default: () => ({ left: false, sticker: null }),
  ...wait,
})

const settled = (s: string) => s === 'success' || s === 'error'

const older = ref<Sticker[]>([])
const olderNext = ref<number | null | undefined>()
const loadingOlder = ref(false)
const olderError = ref(false)
const placed = ref<BoardSticker | null>(null)
const draft = ref<StickerDraft | null>(null)
const posting = ref(false)
const problem = ref('')
const form = ref<{ post: (place: Placement, shareCountry: boolean) => Promise<string | null>, open: (from?: DOMRect) => void, back: () => void }>()
const opener = ref<HTMLButtonElement>()
const board = ref<ComponentPublicInstance>()
const sheet = ref<HTMLDialogElement>()
let boardWas: number | null = null
const boardTop = () => (board.value?.$el as HTMLElement | undefined)?.getBoundingClientRect().top ?? 0

const drawable = (s: Sticker) => {
  const t = stickerTemplate(s.template)
  return !!t && !stickerProblem(t, s.strokes)
}

const approved = computed(() => [...(data.value?.stickers ?? []), ...older.value].filter(drawable))
const echoes = computed<BoardSticker[]>(() => {
  if (placed.value) return [placed.value]
  const mine = own.value.sticker
  return mine && drawable(mine) ? [{ ...mine, pending: true }] : []
})
const shown = computed(() => [...echoes.value, ...approved.value.filter(s => !echoes.value.some(e => e.id === s.id))])
const next = computed(() => olderNext.value === undefined ? data.value?.next ?? null : olderNext.value)
const total = computed(() => data.value?.total ?? 0)

function onSent(sticker: Sticker) {
  boardWas = boardTop()
  placed.value = { ...sticker, pending: true, placed: true }
  own.value = { left: true, sticker }
}

function onLeft() {
  own.value = { ...own.value, left: true }
  refreshOwn()
}

function onPlace(d: StickerDraft) {
  draft.value = d
  problem.value = ''
}

async function onStick(place: Placement, shareCountry: boolean) {
  if (posting.value || !form.value) return
  posting.value = true
  problem.value = ''
  const trouble = await form.value.post(place, shareCountry)
  posting.value = false
  if (trouble) {
    problem.value = trouble
    return
  }
  draft.value = null
  // on a page the board moves as the placing bar under it goes; over a page there is nothing to keep still
  if (boardWas !== null && !props.overlay) window.scrollBy(0, boardTop() - boardWas)
  boardWas = null
}

async function onCancel() {
  if (posting.value) return
  draft.value = null
  problem.value = ''
  await nextTick()
  form.value?.back()
}

// the board comes up for the sticker to be placed, and goes once it is stuck on or the visitor backs out
watch(draft, async (d) => {
  await nextTick()
  const el = sheet.value
  if (!el) return
  if (d && !el.open) el.showModal()
  else if (!d && el.open) el.close()
})

// it may be mounted by the very press that asks for the pad, so the first one is answered once the pad exists
watch(() => props.asked, (asked) => {
  if (asked) form.value?.open(props.from)
}, { flush: 'post' })
onMounted(() => {
  if (props.asked) form.value?.open(props.from)
})

async function loadOlder() {
  if (loadingOlder.value || !next.value) return
  loadingOlder.value = true
  olderError.value = false
  try {
    const res = await $fetch<StickerPage>('/api/guestbook', { query: { before: next.value, limit: LIMIT } })
    older.value = [...older.value, ...res.stickers]
    olderNext.value = res.next
  }
  catch {
    olderError.value = true
  }
  finally {
    loadingOlder.value = false
  }
}
</script>

<template>
  <div v-if="overlay" class="overlay">
    <GuestbookForm ref="form" centred :left="own.left" :placing="!!draft" @sent="onSent" @left="onLeft" @place="onPlace" />
    <dialog ref="sheet" class="sheet" aria-label="Place your sticker" @cancel.prevent="onCancel">
      <StickerBoard
        v-if="draft"
        ref="board"
        class="flush"
        :stickers="shown"
        :draft="draft"
        :posting="posting"
        :problem="problem"
        @place="onStick"
        @cancel="onCancel"
      />
    </dialog>
  </div>
  <section v-else id="stickers" class="section" :class="{ page }" aria-labelledby="stickers-title">
    <div class="head">
      <component :is="page ? 'h1' : 'h2'" id="stickers-title" :class="page ? 'page-title' : 'label title'">
        {{ page ? 'Sticker book' : 'Stickers' }}<template v-if="!page && total">, {{ total }} left by visitors</template>
      </component>
      <button v-if="settled(ownStatus) && !own.left && !draft" ref="opener" type="button" class="button soft" @click="form?.open(opener?.getBoundingClientRect())">
        Leave a sticker
      </button>
    </div>
    <div class="body">
      <!-- the home page has the artwork already, and a second copy under the same names loses the stickers their colours when it goes -->
      <StickerDefs v-if="page" />
      <GuestbookForm ref="form" :left="own.left" :placing="!!draft" @sent="onSent" @left="onLeft" @place="onPlace" />
      <StickerBoard
        ref="board"
        class="listed"
        :stickers="shown"
        :draft="draft"
        :posting="posting"
        :problem="problem"
        :note="!settled(status) ? '' : error && !echoes.length ? 'The stickers are not loading right now.' : 'No stickers yet.'"
        @place="onStick"
        @cancel="onCancel"
      />
      <p v-if="!page && total > approved.length" class="more">
        <NuxtLink to="/stickers" class="button soft">
          See all {{ total }} stickers
        </NuxtLink>
      </p>
      <p v-if="page && next" class="more">
        <button type="button" class="button soft" :aria-disabled="loadingOlder ? 'true' : undefined" @click="loadOlder">
          {{ loadingOlder ? 'Loading' : 'Show older stickers' }}
        </button>
        <span v-if="olderError" class="meta" role="alert">That did not load. Try again.</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.sheet {
  width: min(55rem, calc(100vw - 2 * var(--s4)));
  max-height: calc(100dvh - 2 * var(--s4));
  margin: auto;
  padding: var(--s4);
  border-radius: var(--r4);
  background: var(--surface);
  box-shadow:
    var(--edge),
    0 24px 64px -16px oklch(0% 0 0 / 0.5);
  color: var(--ink-2);
  opacity: 0;
  scale: 0.97;
  transition:
    opacity 180ms ease,
    scale 220ms var(--ease-out),
    overlay 220ms allow-discrete,
    display 220ms allow-discrete;
}

.sheet[open] {
  opacity: 1;
  scale: 1;
}

@starting-style {
  .sheet[open] {
    opacity: 0;
    scale: 0.97;
  }
}

.sheet::backdrop {
  background: oklch(0% 0 0 / 0.55);
}

.sheet .flush {
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sheet {
    transition: none;
  }
}

/* the row is as tall as its button; pulled up so the heading, centred in it, starts where every other section's does */
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s2) var(--s4);
  min-height: 44px;
  margin-top: calc(var(--s3) * -1);
}

.page .head {
  margin-top: 0;
}

/* the row centres it */
.title {
  margin: 0;
}

.body .listed {
  margin-top: var(--s3);
}

.more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--s2) var(--s4);
  margin: var(--s4) 0 0;
}
</style>
