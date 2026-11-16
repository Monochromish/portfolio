// a carried sticker leans the way it is going; held still or moved straight up or down, it hangs straight

// full lean at this sideways speed, in board widths a second; below STILL is not moving
const FULL_SPEED = 0.5
const STILL = 0.05
// slow to straighten, so one set down at the end of a move keeps most of its lean
const LEAN_MS = 90
const STRAIGHTEN_MS = 900

// lean runs from -1 (full left) to 1; `moved` is in board widths, `dt` in seconds
export function nextLean(lean: number, moved: number, dt: number) {
  if (dt <= 0) return lean
  const speed = moved / dt
  const k = Math.min(1, Math.max(0, (Math.abs(speed) - STILL) / (FULL_SPEED - STILL)))
  const wanted = Math.sign(speed) * k * k * (3 - 2 * k)
  // quick to follow a faster move or a turn, slow to let go
  const quick = Math.abs(wanted) > Math.abs(lean) || wanted * lean < 0
  return lean + (wanted - lean) * (1 - Math.exp(-dt * 1000 / (quick ? LEAN_MS : STRAIGHTEN_MS)))
}
