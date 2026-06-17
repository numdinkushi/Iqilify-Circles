import { ConvexHttpClient } from "convex/browser"

import { api } from "@/convex/_generated/api"

let client: ConvexHttpClient | null = null

export function getConvexServerClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return null
  if (!client) client = new ConvexHttpClient(url)
  return client
}

type SessionStatus = "pending" | "in_progress" | "grading" | "completed" | "failed"
type SkillLevel = "beginner" | "intermediate" | "advanced"
type Track = "technical" | "behavioral" | "builder"

export async function convexCreateSession(args: {
  sessionId: string
  track: Track
  role: string
  company: string
  duration: number
  skillLevel: SkillLevel
  interviewType: string
  walletAddress?: string
  status: SessionStatus
}) {
  const convex = getConvexServerClient()
  if (!convex) return null
  return convex.mutation(api.sessions.create, args)
}

export async function convexUpdateSession(args: {
  sessionId: string
  status?: SessionStatus
  voiceMode?: "vapi" | "browser"
  vapiCallId?: string
  localTranscript?: string
  overallScore?: number
  clarity?: number
  depth?: number
  structure?: number
  circlesFit?: number
  feedback?: string
  strengths?: string[]
  areasForImprovement?: string[]
  recommendation?: string
  debriefUnlocked?: boolean
  rewardClaimed?: boolean
  rewardTxHash?: string
  rewardAmountCrc?: number
  walletAddress?: string
}) {
  const convex = getConvexServerClient()
  if (!convex) return null
  return convex.mutation(api.sessions.update, args)
}

export async function convexGetSession(sessionId: string) {
  const convex = getConvexServerClient()
  if (!convex) return null
  return convex.query(api.sessions.getBySessionId, { sessionId })
}

export async function convexHealthCheck() {
  const convex = getConvexServerClient()
  if (!convex) return { ok: false, reason: "NEXT_PUBLIC_CONVEX_URL not set" }
  return convex.query(api.sessions.health, {})
}
