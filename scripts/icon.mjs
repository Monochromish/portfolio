import { writeFile } from 'node:fs/promises'

const AVATAR = 'https://avatars.githubusercontent.com/u/79590499?v=4'
const PUBLIC = new URL('../public/', import.meta.url)

async function picture(size) {
  const res = await fetch(`${AVATAR}&s=${size}`, { signal: AbortSignal.timeout(10_000) })
  const type = res.headers.get('content-type')
  if (!res.ok || type !== 'image/jpeg') throw new Error(`GitHub answered ${res.status} with ${type} at ${size} px`)
  return Buffer.from(await res.arrayBuffer())
}

try {
  // 128 px is a 32 CSS px tab icon at 4x
  const [round, tab, touch, card] = await Promise.all([128, 32, 180, 192].map(picture))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><clipPath id="c"><circle cx="64" cy="64" r="64"/></clipPath><image width="128" height="128" clip-path="url(#c)" href="data:image/jpeg;base64,${round.toString('base64')}"/></svg>\n`
  await Promise.all([
    writeFile(new URL('icon.svg', PUBLIC), svg),
    writeFile(new URL('icon-32.jpg', PUBLIC), tab),
    writeFile(new URL('apple-touch-icon.jpg', PUBLIC), touch),
    writeFile(new URL('icon-192.jpg', PUBLIC), card),
  ])
  console.log('icon: saved from GitHub')
}
catch (error) {
  console.warn(`icon: kept the last saved files (${error.message})`)
}
