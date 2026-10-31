export interface Spring {
  x: number
  v: number
}

// response: seconds for one undamped period. damping: 1 is critical, below 1 overshoots.
export function stepSpring(s: Spring, target: number, dt: number, response = 0.4, damping = 0.85) {
  const k = (2 * Math.PI / response) ** 2
  const c = 4 * Math.PI * damping / response
  const n = Math.max(1, Math.ceil(dt / (1 / 240)))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    s.v += (-k * (s.x - target) - c * s.v) * h
    s.x += s.v * h
  }
  return s
}

export const springAtRest = (s: Spring, target: number, eps = 1e-3) =>
  Math.abs(s.x - target) < eps && Math.abs(s.v) < eps * 10
