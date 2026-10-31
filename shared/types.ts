export interface Track {
  title: string
  artist: string
  album: string
  url: string
  art: string | null
  playedAt: number | null
  nowPlaying: boolean
}

export interface Film {
  title: string
  year: number | null
  rating: number | null
  liked: boolean
  rewatch: boolean
  watchedOn: string | null
  reviewed: boolean
  url: string
  poster: string | null
}

export type GuestbookStatus = 'pending' | 'approved' | 'rejected'

export interface StickerStroke {
  color: number
  size: number
  points: number[]
}

export interface Sticker {
  id: number
  template: string
  strokes: StickerStroke[]
  createdAt: number
  x: number
  y: number
  rot: number
  country: string | null
}

export interface Placement {
  x: number
  y: number
  rot: number
}

export interface StickerPage {
  stickers: Sticker[]
  total?: number
  next: number | null
}

export interface OwnSticker {
  left: boolean
  sticker: Sticker | null
}

export interface ModerationSticker extends Sticker {
  status: GuestbookStatus
  decidedAt: number | null
}

export interface RoutineQueue {
  next: number | null
  pending: { id: number, template: string, createdAt: number }[]
}

export interface StickerView {
  id: number
  template: string
  status: GuestbookStatus
  createdAt: number
  svg: string
  view: string
}

export interface GuestbookQueue {
  pending: ModerationSticker[]
  next: number | null
  recent: ModerationSticker[]
}

export interface StickerSubmission extends Placement {
  template: string
  strokes: StickerStroke[]
  shareCountry: boolean
  website: string
  formToken: string
  turnstileToken?: string
}

export interface GuestbookReceipt {
  status: 'pending'
  id: number
  country: string | null
}

export type GuestbookRejection =
  | 'too-large'
  | 'bad-request'
  | 'honeypot'
  | 'form-token'
  | 'too-fast'
  | 'form-expired'
  | 'rate-limited'
  | 'daily-cap'
  | 'turnstile'
  | 'invalid-sticker'
  | 'one-per-visitor'
  | 'book-full'
