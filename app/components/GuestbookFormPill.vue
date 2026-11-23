<template>
  <button type="button" class="guestbook-form-pill">
    <slot />
  </button>
</template>

<style scoped>
.guestbook-form-pill {
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

.guestbook-form-pill::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  opacity: 0;
  transition: opacity 150ms ease;
}

.guestbook-form-pill[aria-checked='true'] {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  color: var(--ink);
}

@media (hover: hover) and (pointer: fine) {
  .guestbook-form-pill:not([aria-checked='true'], [aria-disabled='true']):hover::before {
    opacity: 1;
  }
}

.guestbook-form-pill:active {
  transform: scale(0.97);
}

.guestbook-form-pill[aria-disabled='true'] {
  color: var(--ink-3);
  opacity: 0.6;
  cursor: default;
}

.guestbook-form-pill[aria-disabled='true']:active {
  transform: none;
}
</style>
