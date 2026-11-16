<script setup lang="ts">
import { stickerProblem, stickerTemplate } from '#shared/guestbook'
import type { ComponentPublicInstance } from 'vue'
import type { OwnSticker, Placement, Sticker, StickerPage } from '#shared/types'
import type { BoardSticker, StickerDraft } from './StickerBoard.vue'

const props = defineProps<{ page?: boolean }>()

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
  if (boardWas !== null) window.scrollBy(0, boardTop() - boardWas)
  boardWas = null
}

async function onCancel() {
  if (posting.value) return
  draft.value = null
  problem.value = ''
  await nextTick()
  form.value?.back()
}

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
  <section id="stickers" class="section" :class="{ page }" aria-labelledby="stickers-title">
    <div class="head">
      <component :is="page ? 'h1' : 'h2'" id="stickers-title" :class="page ? 'page-title' : 'label title'">
        {{ page ? 'Sticker book' : 'Stickers' }}<template v-if="!page && total">, {{ total }} left by visitors</template>
      </component>
      <button v-if="settled(ownStatus) && !own.left && !draft" ref="opener" type="button" class="button soft" @click="form?.open(opener?.getBoundingClientRect())">
        Leave a sticker
      </button>
    </div>
    <div class="body">
      <StickerDefs />
      <GuestbookForm ref="form" :left="own.left" :placing="!!draft" @sent="onSent" @left="onLeft" @place="onPlace" />
      <StickerBoard
        ref="board"
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
.body :deep(.board-wrap) {
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
