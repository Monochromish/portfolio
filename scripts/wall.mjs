// the home page's dotted wall, with ripples running through it: each dot swells and brightens as a ripple passes,
// and the ripples fade with distance from where they start

// from: where the ripples start. wave: px from one ripple to the next. reach: px until they have faded out
export function ripples(w, h, gap, { x, y, wave, reach }, ink) {
  let out = ''
  for (let gy = gap / 2; gy < h; gy += gap) {
    for (let gx = gap / 2; gx < w; gx += gap) {
      const d = Math.hypot(gx - x, gy - y)
      const a = Math.atan2(gy - y, gx - x)
      // two slow waves around each ripple, so it is not a circle
      const stray = wave * 0.16 * (0.6 * Math.sin(3 * a + 1.2) + 0.4 * Math.sin(5 * a - 0.9))
      const crest = (0.5 + 0.5 * Math.cos((d + stray) / wave * 2 * Math.PI)) ** 1.6
      const fade = Math.max(0, 1 - d / reach) ** 1.3
      const r = gap * (0.06 + 0.27 * crest * fade)
      out += `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${r.toFixed(2)}" fill="${ink}" opacity="${(0.16 + 0.7 * crest * fade).toFixed(3)}"/>`
    }
  }
  return out
}
