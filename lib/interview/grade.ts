import { buildFeedback, scoreSession } from "@/lib/interview/scoring"
import type { InterviewMessage, InterviewTrack, ScoreBreakdown, SkillLevel } from "@/lib/interview/types"

export type GradeResult = {
  score: ScoreBreakdown
  feedback: string
  strengths: string[]
  areasForImprovement: string[]
  recommendation: "strong-hire" | "hire" | "maybe" | "no-hire" | "retry"
}

export function parseTranscript(transcript: string): InterviewMessage[] {
  const messages: InterviewMessage[] = []

  for (const line of transcript.split("\n")) {
    const match = line.match(/^(Interviewer|Candidate):\s*(.+)$/i)
    if (!match) continue
    messages.push({
      role: match[1].toLowerCase() === "interviewer" ? "interviewer" : "candidate",
      content: match[2].trim(),
    })
  }

  return messages
}

function recommendationForScore(overall: number): GradeResult["recommendation"] {
  if (overall >= 85) return "strong-hire"
  if (overall >= 70) return "hire"
  if (overall >= 50) return "maybe"
  return "no-hire"
}

function strengthsForScore(track: InterviewTrack, score: ScoreBreakdown): string[] {
  const strengths: string[] = []

  if (score.clarity >= 70) strengths.push("Answers were clear and easy to follow")
  if (score.depth >= 70) strengths.push("Good depth with useful detail")
  if (score.structure >= 70) strengths.push("Responses had a logical structure")
  if (track === "builder" && (score.circlesFit ?? 0) >= 70) {
    strengths.push("Strong awareness of Circles concepts and primitives")
  }

  return strengths
}

export function gradeInterview(input: {
  track: InterviewTrack
  messages: InterviewMessage[]
  skillLevel?: SkillLevel
  expectedDurationMinutes?: number
}): GradeResult {
  const { track, messages } = input
  const candidateAnswers = messages.filter((message) => message.role === "candidate")

  if (candidateAnswers.length === 0) {
    return {
      score: { clarity: 0, depth: 0, structure: 0, overall: 0 },
      feedback: "No answers were captured. Try again and speak clearly after each question.",
      strengths: [],
      areasForImprovement: [
        "Grant microphone access when prompted",
        "Wait for the listening indicator before answering",
        "Speak in full sentences so speech-to-text can capture your response",
      ],
      recommendation: "retry",
    }
  }

  const score = scoreSession(track, messages)
  const areasForImprovement = buildFeedback(track, score)
  const strengths = strengthsForScore(track, score)

  const feedback =
    score.overall >= 70
      ? "Solid interview. You covered the core questions with useful detail."
      : score.overall >= 50
        ? "Decent start. Add more specifics and structure to push your score higher."
        : "Keep practicing. Focus on clear openers, one concrete example, and a crisp takeaway."

  return {
    score,
    feedback,
    strengths,
    areasForImprovement,
    recommendation: recommendationForScore(score.overall),
  }
}

export function resolveMessages(input: {
  messages?: InterviewMessage[]
  transcript?: string
}): InterviewMessage[] {
  if (input.messages && input.messages.length > 0) return input.messages
  if (input.transcript?.trim()) return parseTranscript(input.transcript)
  return []
}

export function formatMessagesAsTranscript(messages: InterviewMessage[]): string {
  return messages
    .map((message) =>
      `${message.role === "interviewer" ? "Interviewer" : "Candidate"}: ${message.content}`,
    )
    .join("\n")
}
