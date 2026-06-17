import type { InterviewSession, LeaderboardEntry } from "@/lib/interview/types"

const SESSION_PREFIX = "iqlify:session:"
const LEADERBOARD_KEY = "iqlify:leaderboard"

function isBrowser() {
  return typeof window !== "undefined"
}

export function saveSession(session: InterviewSession) {
  if (!isBrowser()) return
  window.localStorage.setItem(`${SESSION_PREFIX}${session.id}`, JSON.stringify(session))
}

export function loadSession(id: string): InterviewSession | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(`${SESSION_PREFIX}${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as InterviewSession
  } catch {
    return null
  }
}

export function loadLeaderboard(): LeaderboardEntry[] {
  if (!isBrowser()) return []
  const raw = window.localStorage.getItem(LEADERBOARD_KEY)
  if (!raw) return []
  try {
    return (JSON.parse(raw) as LeaderboardEntry[]).sort((a, b) => b.score - a.score)
  } catch {
    return []
  }
}

export function addLeaderboardEntry(entry: LeaderboardEntry) {
  if (!isBrowser()) return
  const current = loadLeaderboard().filter((item) => item.sessionId !== entry.sessionId)
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify([entry, ...current].slice(0, 50)))
}
