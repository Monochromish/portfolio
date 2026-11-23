<script setup lang="ts">
defineProps<{ posting?: boolean, problem?: string }>()
const share = defineModel<boolean>('share', { required: true })
const emit = defineEmits<{ cancel: [], stick: [] }>()
</script>

<template>
  <div class="sticker-board-placing">
    <p class="hint">
      Drag your sticker anywhere on the board.
    </p>
    <div class="choices">
      <label class="share">
        <input v-model="share" class="box" type="checkbox">
        Share my country
      </label>
      <div class="buttons">
        <button type="button" class="action cancel" @click="emit('cancel')">
          Cancel
        </button>
        <button type="button" class="action stick" :aria-disabled="posting ? 'true' : undefined" @click="emit('stick')">
          {{ posting ? 'Sticking' : 'Stick it here' }}
          <span class="i-site-send glyph" aria-hidden="true" />
        </button>
      </div>
    </div>
    <p v-if="problem" class="problem" role="alert">
      {{ problem }}
    </p>
  </div>
</template>

<style scoped>
.sticker-board-placing {
  margin-top: 14px;
  padding-inline: 8px;
}

.hint {
  margin: 0;
  font-size: 14px;
  text-align: center;
  color: var(--ink-2);
}

.choices {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 20px;
  margin-top: 10px;
}

.share {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  font-size: 15px;
  font-weight: 550;
  color: var(--ink);
  cursor: pointer;
}

.box {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--ink);
  cursor: pointer;
}

.buttons {
  display: flex;
  gap: 8px;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border-radius: var(--r2);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    box-shadow 150ms ease,
    border-radius 200ms var(--ease-out),
    transform 160ms var(--ease-out);
}

.action:active {
  transform: scale(0.97);
}

.cancel {
  --limn-edge: var(--edge);
  padding: 0 16px;
  background: var(--fill);
  box-shadow: var(--limn-edge);
  color: var(--ink);
}

@media (hover: hover) and (pointer: fine) {
  .cancel:hover {
    --limn-edge: var(--edge-lift);
    border-radius: var(--r3);
    background: var(--fill-hover);
  }
}

.cancel:active {
  --limn-edge: var(--edge-down);
}

.stick {
  padding: 0 18px 0 20px;
  background: var(--ink);
  box-shadow: var(--edge-ink);
  color: var(--paper);
}

@media (hover: hover) and (pointer: fine) {
  .stick:not([aria-disabled='true']):hover {
    border-radius: var(--r3);
    background: var(--ink-2);
  }
}

.stick[aria-disabled='true'] {
  background: color-mix(in srgb, var(--ink) 70%, var(--paper));
  cursor: progress;
}

.glyph {
  font-size: 18px;
}

.problem {
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 550;
  line-height: 1.45;
  text-align: center;
  color: var(--ink);
}
</style>
