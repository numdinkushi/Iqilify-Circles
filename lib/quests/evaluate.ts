import type { InterviewSession } from "@/lib/interview/types"
import { getRewardConfig } from "@/lib/rewards"

export type QuestId =
  | "first_interview"
  | "score_70"
  | "claim_crc"
  | "unlock_debrief"
  | "leaderboard"
  | "referral_link"
  | "custom_avatar"
  | "duel_challenge"

export type QuestDefinition = {
  id: QuestId
  title: string
  description: string
  xp: number
  icon: string
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: "first_interview",
    title: "First session",
    description: "Complete any AI interview",
    xp: 25,
    icon: "🎤",
  },
  {
    id: "score_70",
    title: "Strong answer",
    description: `Score ${getRewardConfig().minScore}+ on any session`,
    xp: 30,
    icon: "⭐",
  },
  {
    id: "claim_crc",
    title: "Earn CRC",
    description: "Claim an interview CRC reward",
    xp: 20,
    icon: "💰",
  },
  {
    id: "unlock_debrief",
    title: "Full debrief",
    description: "Unlock your AI debrief with CRC",
    xp: 25,
    icon: "🔓",
  },
  {
    id: "leaderboard",
    title: "Go public",
    description: "Post a score to the leaderboard",
    xp: 20,
    icon: "🏆",
  },
  {
    id: "referral_link",
    title: "Spread the word",
    description: "Copy a Circles referral invite link",
    xp: 15,
    icon: "🔗",
  },
  {
    id: "custom_avatar",
    title: "Make it yours",
    description: "Upload a custom profile avatar",
    xp: 10,
    icon: "🖼️",
  },
  {
    id: "duel_challenge",
    title: "Throw down",
    description: "Challenge a friend to beat your score",
    xp: 15,
    icon: "⚔️",
  },
]

const SESSION_PREFIX = "iqlify:session:"
const QUEST_FLAGS_PREFIX = "iqlify:quest-flags:"

export type QuestProgressInput = {
  address?: string | null
  avatarUrl?: string | null
  referralStats?: { claimed: number; pending: number; total: number } | null
}

export type QuestItem = QuestDefinition & {
  done: boolean
}

function isBrowser() {
  return typeof window !== "undefined"
}

function loadAllSessions(): InterviewSession[] {
  if (!isBrowser()) return []
  const sessions: InterviewSession[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key?.startsWith(SESSION_PREFIX)) continue
    const raw = window.localStorage.getItem(key)
    if (!raw) continue
    try {
      sessions.push(JSON.parse(raw) as InterviewSession)
    } catch {
      // skip corrupt entries
    }
  }
  return sessions
}

function loadQuestFlags(address?: string | null): Record<string, boolean> {
  if (!isBrowser() || !address) return {}
  const raw = window.localStorage.getItem(`${QUEST_FLAGS_PREFIX}${address.toLowerCase()}`)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function markQuestFlag(address: string, questId: QuestId) {
  if (!isBrowser()) return
  const key = `${QUEST_FLAGS_PREFIX}${address.toLowerCase()}`
  const flags = loadQuestFlags(address)
  flags[questId] = true
  window.localStorage.setItem(key, JSON.stringify(flags))
}

export function hasLocalQuestFlag(address: string, questId: QuestId): boolean {
  return loadQuestFlags(address)[questId] === true
}

export function evaluateQuests(input: QuestProgressInput): QuestItem[] {
  const sessions = loadAllSessions()
  const walletSessions = input.address
    ? sessions.filter(
        (s) => s.walletAddress?.toLowerCase() === input.address!.toLowerCase()
      )
    : sessions

  const flags = loadQuestFlags(input.address)
  const minScore = getRewardConfig().minScore

  const checks: Record<QuestId, boolean> = {
    first_interview: walletSessions.some((s) => s.completed && s.score),
    score_70: walletSessions.some((s) => (s.score?.overall ?? 0) >= minScore),
    claim_crc: walletSessions.some((s) => s.rewardClaimed),
    unlock_debrief: walletSessions.some((s) => s.debriefUnlocked),
    leaderboard: walletSessions.some((s) => s.debriefUnlocked),
    referral_link: flags.referral_link === true || (input.referralStats?.total ?? 0) > 0,
    custom_avatar: !!input.avatarUrl?.trim(),
    duel_challenge: flags.duel_challenge === true,
  }

  return QUEST_DEFINITIONS.map((quest) => ({
    ...quest,
    done: checks[quest.id],
  }))
}

export function questSummary(items: QuestItem[]) {
  const earnedXp = items.filter((q) => q.done).reduce((sum, q) => sum + q.xp, 0)
  const totalXp = items.reduce((sum, q) => sum + q.xp, 0)
  const completedQuests = items.filter((q) => q.done).length
  return { earnedXp, totalXp, completedQuests, totalQuests: items.length }
}

export function readinessTier(earnedXp: number, totalXp: number) {
  const pct = totalXp > 0 ? (earnedXp / totalXp) * 100 : 0
  if (pct >= 90) return { label: "Interview pro", color: "text-emerald-600" }
  if (pct >= 60) return { label: "Rising builder", color: "text-amber-600" }
  if (pct >= 30) return { label: "Getting started", color: "text-blue-600" }
  return { label: "New here", color: "text-muted-foreground" }
}
