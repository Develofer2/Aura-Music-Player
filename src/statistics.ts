/** Listening statistics derived from stored events. Copyright (c) 2026 Develofer2. MIT License. */
export function playedInterval(
  elapsed: number,
  moved: number,
  playing: boolean,
  seeking: boolean,
) {
  return playing && !seeking && moved > 0 && moved < elapsed + 0.8
    ? Math.max(0, Math.min(elapsed, moved))
    : 0
}
export function qualifies(seconds: number, duration: number) {
  return duration > 0 && seconds >= Math.min(30, duration / 2)
}
export function localDay(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
export function addDailyInterval(
  daily: Record<string, number>,
  end: number,
  seconds: number,
) {
  let start = end - seconds * 1000
  while (start < end) {
    const midnight = new Date(start)
    midnight.setHours(24, 0, 0, 0)
    const split = Math.min(end, midnight.getTime()),
      key = localDay(start)
    daily[key] = (daily[key] || 0) + (split - start) / 1000
    start = split
  }
}
