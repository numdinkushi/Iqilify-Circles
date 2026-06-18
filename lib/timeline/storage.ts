export type TimelineEventType =
  | "interview_complete"
  | "reward_claimed"
  | "debrief_unlocked"
  | "referral_sent"
  | "duel_sent"
  | "avatar_updated"
  | "leaderboard_joined"

export type TimelineEvent = {
  id: string
  type: TimelineEventType
  title: string
  detail?: string
  value?: number
  createdAt: number
}

const TIMELINE_PREFIX = "iqlify:timeline:"
const MAX_EVENTS = 40

function timelineKey(address: string) {
  return `${TIMELINE_PREFIX}${address.toLowerCase()}`
}

function isBrowser() {
  return typeof window !== "undefined"
}

export function loadTimeline(address: string): TimelineEvent[] {
  if (!isBrowser()) return []
  const raw = window.localStorage.getItem(timelineKey(address))
  if (!raw) return []
  try {
    return (JSON.parse(raw) as TimelineEvent[]).sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export function recordTimelineEvent(
  address: string,
  event: Omit<TimelineEvent, "id" | "createdAt"> & { id?: string; createdAt?: number }
) {
  if (!isBrowser()) return
  const existing = loadTimeline(address)
  const entry: TimelineEvent = {
    id: event.id ?? crypto.randomUUID(),
    createdAt: event.createdAt ?? Date.now(),
    type: event.type,
    title: event.title,
    detail: event.detail,
    value: event.value,
  }
  const next = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, MAX_EVENTS)
  window.localStorage.setItem(timelineKey(address), JSON.stringify(next))
}

export function formatTimelineWhen(timestamp: number) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}
