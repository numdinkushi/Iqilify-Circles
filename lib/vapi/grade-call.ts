import { gradeInterview, resolveMessages } from "@/lib/interview/grade"
import type { InterviewTrack } from "@/lib/interview/types"
import {
  extractMessagesFromVapiCall,
  formatMessagesAsTranscript,
} from "@/lib/vapi/extract-transcript"

export async function gradeFromCallData(
  callId: string,
  callData: Record<string, unknown>,
  opts?: {
    role?: string
    skillLevel?: string
    expectedDurationMinutes?: number
    interviewType?: string
    track?: InterviewTrack
  },
) {
  const messages = extractMessagesFromVapiCall(callData)
  const transcript = formatMessagesAsTranscript(messages)
  const result = gradeInterview({
    track: opts?.track || "technical",
    messages,
    skillLevel: (opts?.skillLevel as "beginner" | "intermediate" | "advanced") || "intermediate",
    expectedDurationMinutes: opts?.expectedDurationMinutes || 10,
  })

  return {
    callId,
    overallScore: result.score.overall / 10,
    recommendation: result.recommendation,
    summary: result.feedback,
    keyHighlights: result.strengths,
    areasForImprovement: result.areasForImprovement,
    transcriptLength: transcript.length,
    transcriptWordCount: transcript.split(/\s+/).filter(Boolean).length,
    candidateMessageCount: messages.filter((message) => message.role === "candidate").length,
    callDuration: Number(callData.duration) || 0,
    isFailedInterview: result.recommendation === "retry",
    timestamp: new Date().toISOString(),
  }
}

export async function gradeFromTranscript(
  callId: string,
  transcript: string,
  opts?: {
    role?: string
    skillLevel?: string
    expectedDurationMinutes?: number
    interviewType?: string
    track?: InterviewTrack
  },
) {
  const messages = resolveMessages({ transcript })
  const result = gradeInterview({
    track: opts?.track || "technical",
    messages,
    skillLevel: (opts?.skillLevel as "beginner" | "intermediate" | "advanced") || "intermediate",
    expectedDurationMinutes: opts?.expectedDurationMinutes || 10,
  })

  return {
    callId,
    overallScore: result.score.overall / 10,
    recommendation: result.recommendation,
    summary: result.feedback,
    keyHighlights: result.strengths,
    areasForImprovement: result.areasForImprovement,
    transcriptLength: transcript.length,
    transcriptWordCount: transcript.split(/\s+/).filter(Boolean).length,
    candidateMessageCount: messages.filter((message) => message.role === "candidate").length,
    callDuration: 0,
    isFailedInterview: result.recommendation === "retry",
    timestamp: new Date().toISOString(),
  }
}
