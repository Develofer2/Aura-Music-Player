/** Listening statistics page. Copyright (c) 2026 Develofer2. MIT License. */
import { useState } from "react"
import { Headphones, Music2, Play, Clock3 } from "lucide-react"
import { Artwork, Button, Heading, Select } from "../components/ui"
import { useAura } from "../state"
import { player } from "../playback"
import { localDay } from "../statistics"
export default function Stats() {
  const aura = useAura(),
    [windowDays, setWindowDays] = useState(0),
    [groupBy, setGroupBy] = useState("tracks")
  const events = aura.events.filter(
    (e) =>
      !windowDays ||
      (e.qualifiedAt ?? e.started) > Date.now() - windowDays * 86400000,
  )
  const seconds = events.reduce((sum, e) => sum + e.seconds, 0),
    plays = events.filter((e) => e.qualified).length
  const rankings = new Map<string, {
    name: string
    id: string
    count: number
    artist: string
  }>()
  for (const event of events.filter((e) => e.qualified)) {
    const t = aura.tracks.find((t) => t.id === event.trackId)
    if (!t) continue
    const key =
      groupBy === "artists" ? t.artist : groupBy === "albums" ? t.album : t.id
    const entry = rankings.get(key) || {
      name:
        groupBy === "artists"
          ? t.artist
          : groupBy === "albums"
            ? t.album
            : t.title,
      artist: t.artist,
      id: t.id,
      count: 0,
    }
    entry.count++
    rankings.set(key, entry)
  }
  const top = [...rankings.values()].sort((a, b) => b.count - a.count)
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - 13 + i)
    date.setHours(0, 0, 0, 0)
    const next = new Date(date)
    next.setDate(date.getDate() + 1)
    const value = aura.events.reduce(
      (sum, e) =>
        sum +
        (e.daily
          ? e.daily[localDay(date.getTime())] || 0
          : e.started >= date.getTime() && e.started < next.getTime()
            ? e.seconds
            : 0) /
          60,
      0,
    )
    return { date, value }
  })
  const max = Math.max(1, ...days.map((d) => d.value))
  return (
    <div className="page">
      <div className="section-heading page-intro">
        <div>
          <span className="eyebrow">THE SOUND OF YOUR DAYS</span>
          <Heading level={1}>
            Your listening story<span className="accent">.</span>
          </Heading>
          <p className="muted">
            Not an algorithm’s idea of you. Just what you actually love.
          </p>
        </div>
        <Select
          aria-label="Statistics period"
          value={windowDays}
          onValueChange={(value) => setWindowDays(Number(value))}
        >
          <option value={0}>All time</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </Select>
      </div>
      <div className="snapshot-grid">
        {[
          {
            icon: Clock3,
            value: `${Math.floor(seconds / 60)} min`,
            label: "Listening time",
          },
          { icon: Headphones, value: plays, label: "Qualified plays" },
          {
            icon: Music2,
            value: new Set(
              events.filter((e) => e.qualified).map((e) => e.trackId),
            ).size,
            label: "Tracks explored",
          },
        ].map((item) => (
          <div className="snapshot" key={item.label}>
            <div className="snapshot-icon">
              <item.icon size={21} />
            </div>
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
      {!aura.events.some((e) => e.seconds > 0) && (
        <div className="info-line">
          <Headphones size={20} />
          <p>
            Every story starts with a first play. Listen to your music and your
            statistics will grow here—never filled with sample numbers.
          </p>
        </div>
      )}
      <section className="chart-card">
        <div className="section-heading">
          <div>
            <Heading>Your rhythm</Heading>
            <p className="muted">Listening minutes · last 14 days</p>
          </div>
        </div>
        <div className="activity-chart">
          {days.map((d) => (
            <div className="chart-column" key={d.date.getTime()}>
              <span className="chart-value">
                {d.value ? `${Math.round(d.value)}m` : ""}
              </span>
              <div
                className="chart-bar"
                style={{ height: `${Math.max(1, (d.value / max) * 100)}%` }}
                title={`${d.date.toLocaleDateString()}: ${d.value.toFixed(1)} minutes`}
              />
              <small>{d.date.getDate()}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="chart-card">
        <div className="section-heading">
          <Heading>On repeat</Heading>
          <Select
            aria-label="Rankings group"
            value={groupBy}
            onValueChange={setGroupBy}
          >
            <option value="tracks">Tracks</option>
            <option value="artists">Artists</option>
            <option value="albums">Albums</option>
          </Select>
        </div>
        {!top.length ? (
          <div className="empty-small">
            <Headphones size={30} />
            <Heading level={3}>
              Your favorites will find their way here.
            </Heading>
            <p className="muted">
              A play counts after 30 seconds, or half a shorter track. Skipping
              ahead doesn’t count as listening.
            </p>
          </div>
        ) : (
          top.slice(0, 20).map((t, i) => (
            <div key={t.name + t.id} className="ranking-row">
              <span className="muted">{i + 1}</span>
              <Artwork id={t.id} />
              <div>
                <strong>{t.name}</strong>
                <span className="muted">{t.artist}</span>
              </div>
              <span>{t.count} plays</span>
              <Button
                variant="ghost"
                aria-label={`Play ${t.name}`}
                onClick={() => void player.start([t.id])}
              >
                <Play size={17} />
              </Button>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
