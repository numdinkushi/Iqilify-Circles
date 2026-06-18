export type InterviewTrack = "technical" | "behavioral" | "builder"

export type InterviewStatus =
  | "pending"
  | "in_progress"
  | "grading"
  | "completed"
  | "failed"

export type SkillLevel = "beginner" | "intermediate" | "advanced"

export type InterviewMessage = {
  role: "interviewer" | "candidate"
  content: string
}

export type ScoreBreakdown = {
  clarity: number
  depth: number
  structure: number
  circlesFit?: number
  overall: number
}

export type InterviewSession = {
  id: string
  track: InterviewTrack
  role: string
  company: string
  messages: InterviewMessage[]
  questionIndex: number
  totalQuestions: number
  completed: boolean
  score?: ScoreBreakdown
  debriefUnlocked: boolean
  rewardClaimed?: boolean
  rewardTxHash?: string
  rewardAmountCrc?: number
  walletAddress?: string
  createdAt: number
  status: InterviewStatus
  duration: number
  skillLevel: SkillLevel
  interviewType: string
  vapiCallId?: string
  voiceMode?: "vapi" | "browser"
  localTranscript?: string
  feedback?: string
  strengths?: string[]
  areasForImprovement?: string[]
  recommendation?: string
}

export type LeaderboardEntry = {
  id: string
  address: string
  displayName: string
  avatarUrl?: string
  track: InterviewTrack
  score: number
  sessionId: string
  createdAt: number
}

export function gradingToScoreBreakdown(
  overallScore: number,
  track: InterviewTrack
): ScoreBreakdown {
  const overall = Math.min(100, Math.max(0, Math.round(overallScore * 10)))
  const clarity = Math.min(100, Math.max(0, overall - 2))
  const depth = Math.min(100, Math.max(0, overall - 4))
  const structure = Math.min(100, Math.max(0, overall - 1))

  return {
    clarity,
    depth,
    structure,
    ...(track === "builder" ? { circlesFit: Math.min(100, overall) } : {}),
    overall,
  }
}
