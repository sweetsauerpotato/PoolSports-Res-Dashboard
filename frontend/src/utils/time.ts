export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

export function elapsedMinutes(since: string): number {
  return Math.floor((Date.now() - new Date(since).getTime()) / 60000)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
