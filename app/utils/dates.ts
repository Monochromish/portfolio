const DAY = 86_400_000
const thisYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const otherYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function startOfDay(t: number | Date) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dayLabel(day: number | Date, now: number) {
  const days = Math.round((startOfDay(now) - startOfDay(day)) / DAY)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return (new Date(day).getFullYear() === new Date(now).getFullYear() ? thisYear : otherYear).format(day)
}
