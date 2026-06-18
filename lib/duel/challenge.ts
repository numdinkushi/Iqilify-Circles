import type { InterviewTrack } from "@/lib/interview/types"
import { buildAppUrl, wrapInCirclesPlayground } from "@/lib/share/urls"

export type DuelChallenge = {
  challengerAddress: string
  challengerName: string
  challengerScore: number
  track: InterviewTrack
  sessionId: string
}

const DUEL_STORAGE_KEY = "iqlify:duel-challenge"

export function buildDuelChallengeUrl(challenge: DuelChallenge) {
  return buildAppUrl("/interview", {
    duel: "1",
    challenger: challenge.challengerAddress,
    challengerName: challenge.challengerName,
    challengerScore: String(challenge.challengerScore),
    track: challenge.track,
    sessionId: challenge.sessionId,
  })
}

export function buildDuelPlaygroundUrl(challenge: DuelChallenge) {
  return wrapInCirclesPlayground(buildDuelChallengeUrl(challenge))
}

export function parseDuelFromSearchParams(params: URLSearchParams): DuelChallenge | null {
  if (params.get("duel") !== "1") return null
  const challenger = params.get("challenger")
  const challengerScore = Number(params.get("challengerScore"))
  const track = params.get("track") as InterviewTrack | null
  const sessionId = params.get("sessionId")
  if (!challenger || !sessionId || !track) return null
  if (!["technical", "behavioral", "builder"].includes(track)) return null
  if (!Number.isFinite(challengerScore)) return null

  return {
    challengerAddress: challenger,
    challengerName: params.get("challengerName") ?? "A builder",
    challengerScore,
    track,
    sessionId,
  }
}

export function persistDuelChallenge(challenge: DuelChallenge) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(DUEL_STORAGE_KEY, JSON.stringify(challenge))
}

export function loadPersistedDuelChallenge(): DuelChallenge | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(DUEL_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DuelChallenge
  } catch {
    return null
  }
}

export function clearPersistedDuelChallenge() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(DUEL_STORAGE_KEY)
}

export function duelOutcome(
  challenge: DuelChallenge,
  yourScore: number
): "win" | "lose" | "tie" {
  if (yourScore > challenge.challengerScore) return "win"
  if (yourScore < challenge.challengerScore) return "lose"
  return "tie"
}
