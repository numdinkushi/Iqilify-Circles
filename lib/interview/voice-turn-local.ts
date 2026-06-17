import { QUESTION_BANK } from "@/lib/interview/prompts"
import type { InterviewMessage, InterviewTrack } from "@/lib/interview/types"

export type VoiceTurnInput = {
  track: InterviewTrack
  role: string
  company?: string
  skillLevel?: string
  messages: InterviewMessage[]
  turnIndex: number
  maxTurns?: number
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function buildLocalInterviewerLine(input: VoiceTurnInput): string {
  const bank = QUESTION_BANK[input.track]
  const turnIndex = input.turnIndex ?? 0
  const question = bank[turnIndex % bank.length]
  const role = input.role || "this role"
  const company = input.company ? ` at ${input.company}` : ""

  if (turnIndex === 0) {
    return `Thanks for joining. You're interviewing for ${role}${company}. ${question}`
  }

  const lastAnswer = [...input.messages].reverse().find((m) => m.role === "candidate")
  const short = lastAnswer ? wordCount(lastAnswer.content) < 30 : false
  const prefix = short
    ? "Thanks — can you go a bit deeper on that? "
    : "Good context. Let's keep moving. "

  return `${prefix}${question}`
}

export function buildVoiceTurnResponse(input: VoiceTurnInput) {
  const maxTurns = input.maxTurns ?? 6
  const turnIndex = input.turnIndex ?? 0

  if (turnIndex >= maxTurns) {
    return {
      done: true as const,
      interviewerMessage: "Thanks for your time today. That wraps up our interview.",
      messages: input.messages,
      turnIndex,
      source: "local" as const,
    }
  }

  const interviewerMessage = buildLocalInterviewerLine(input)
  const messages: InterviewMessage[] = [
    ...input.messages,
    { role: "interviewer", content: interviewerMessage },
  ]

  return {
    done: false as const,
    interviewerMessage,
    messages,
    turnIndex,
    source: "local" as const,
  }
}
