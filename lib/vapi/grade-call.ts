import { gradeInterview, parseTranscript, resolveMessages } from "@/lib/interview/grade"
import type { InterviewTrack } from "@/lib/interview/types"

function extractTranscript(callData: Record<string, unknown>): string {
  const transcript = callData.transcript
  if (Array.isArray(transcript)) {
    return transcript
      .map((msg: { role?: string; content?: string; text?: string }) =>
        `${msg.role || "Unknown"}: ${msg.content || msg.text || ""}`,
      )
      .join("\n")
  }
  if (typeof transcript === "string") return transcript

  const messages = callData.messages
  if (Array.isArray(messages)) {
    return messages
      .map((msg: { role?: string; content?: string; text?: string }) =>
        `${msg.role || "Unknown"}: ${msg.content || msg.text || ""}`,
      )
      .join("\n")
  }
  return ""
}

function normalizeRole(role?: string) {
  if (!role) return "candidate"
  const lower = role.toLowerCase()
  if (lower.includes("assistant") || lower.includes("interviewer")) return "interviewer"
  if (lower.includes("user") || lower.includes("candidate")) return "candidate"
  return "candidate"
}

function transcriptToMessages(transcript: string) {
  const parsed = parseTranscript(
    transcript
      .split("\n")
      .map((line) => {
        const [speaker, ...rest] = line.split(":")
        if (!rest.length) return line
        const role = normalizeRole(speaker.trim())
        const label = role === "interviewer" ? "Interviewer" : "Candidate"
        return `${label}: ${rest.join(":").trim()}`
      })
      .join("\n"),
  )

  return parsed
}

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
  const transcript = extractTranscript(callData)
  const messages = transcriptToMessages(transcript)
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
