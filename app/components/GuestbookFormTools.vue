<script setup lang="ts">
defineProps<{
  inks: readonly { hex: string, name: string }[]
  color: number
  size: number
  canUndo: boolean
  canClear: boolean
}>()
const emit = defineEmits<{ color: [i: number], size: [i: number], undo: [], clear: [] }>()

function onRadioKey(e: KeyboardEvent, index: number, count: number, choose: (i: number) => void) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  const to = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : step ? (index + step + count) % count : -1
  if (to < 0) return
  e.preventDefault()
  choose(to)
  const button = (e.currentTarget as HTMLElement).parentElement?.children[to]
  if (button instanceof HTMLElement) button.focus()
}
</script>

<template>
  <div class="guestbook-form-tools">
    <div class="group" role="radiogroup" aria-label="Ink">
      <button
        v-for="(ink, i) in inks"
        :key="ink.hex"
        type="button"
        role="radio"
        class="ink"
        :aria-checked="color === i"
        :aria-label="ink.name"
        :title="ink.name"
        :tabindex="color === i ? 0 : -1"
        @click="emit('color', i)"
        @keydown="onRadioKey($event, i, inks.length, to => emit('color', to))"
      >
        <span class="swatch" :style="{ '--hue': ink.hex }" />
      </button>
    </div>
    <div class="group" role="radiogroup" aria-label="Brush">
      <GuestbookFormPill
        v-for="(name, i) in ['Fine', 'Bold']"
        :key="name"
        role="radio"
        :aria-checked="size === i"
        :tabindex="size === i ? 0 : -1"
        @click="emit('size', i)"
        @keydown="onRadioKey($event, i, 2, to => emit('size', to))"
      >
        <span class="dot" :class="i ? 'bold' : 'fine'" :style="{ '--hue': inks[color]!.hex }" aria-hidden="true" />
        {{ name }}
      </GuestbookFormPill>
    </div>
    <div class="group">
      <GuestbookFormPill :aria-disabled="canUndo ? undefined : 'true'" @click="emit('undo')">Undo</GuestbookFormPill>
      <GuestbookFormPill :aria-disabled="canClear ? undefined : 'true'" @click="emit('clear')">Clear</GuestbookFormPill>
    </div>
  </div>
</template>

<style scoped>
.guestbook-form-tools {
  /* half ink: at least 3:1 on the paper in both themes */
  --ring: 0 0 0 1px color-mix(in srgb, var(--ink) 50%, transparent);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 18px;
  margin-top: 14px;
}

.group {
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
  background: var(--hue);
  box-shadow: var(--ring);
}

.ink[aria-checked='true'] .swatch {
  box-shadow:
    var(--ring),
    0 0 0 3px var(--paper),
    0 0 0 5px var(--ink);
}

.dot {
  flex: none;
  border-radius: 999px;
  background: var(--hue);
  box-shadow: var(--ring);
}

.dot.fine {
  width: 6px;
  height: 6px;
}

.dot.bold {
  width: 12px;
  height: 12px;
}
</style>
