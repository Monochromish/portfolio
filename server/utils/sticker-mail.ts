import type { RequestEvent } from 'nuxt/server'

interface Mailer {
  send: (message: object) => Promise<void>
}

async function sendStickerMail(mailer: Mailer | undefined, site: URL, to: string, id: number, template: string, country: string | null) {
  if (!mailer) throw new Error('STICKER_MAIL binding is missing from the Worker')
  const { EmailMessage } = await import('cloudflare:email')
  const from = `stickers@${site.hostname}`
  const raw = [
    `From: Sticker book <${from}>`,
    `To: <${to}>`,
    `Subject: Sticker ${id} is waiting`,
    `Message-ID: <${crypto.randomUUID()}@${site.hostname}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    `A ${template} sticker${country ? ` from ${country}` : ''} is waiting for a decision.`,
    '',
    new URL('/admin', site).href,
    '',
  ].join('\r\n')
  await mailer.send(new EmailMessage(from, to, raw))
}

// the sticker is already saved by now, so a mail that fails is logged and the visitor still gets their receipt
export function announceSticker(event: RequestEvent, id: number, template: string, country: string | null) {
  const config = serverConfig(event)
  const cloudflare = cloudflareContext(event)
  if (!config.notifyEmail || !cloudflare) return
  const mailer = cloudflare.env.STICKER_MAIL as Mailer | undefined
  cloudflare.context.waitUntil(sendStickerMail(mailer, new URL(config.public.siteUrl), config.notifyEmail, id, template, country)
    .catch((error: unknown) => console.error(`[guestbook] no mail went out for sticker ${id}:`, error)))
}
