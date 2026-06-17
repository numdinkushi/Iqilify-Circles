import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import { QUESTION_BANK } from "@/lib/interview/prompts"
import { buildFeedback, scoreSession } from "@/lib/interview/scoring"
import type { InterviewMessage, InterviewTrack } from "@/lib/interview/types"

type Body = {
  action: "start" | "answer" | "feedback"
  track?: InterviewTrack
  role?: string
  company?: string
  messages?: InterviewMessage[]
  answer?: string
  questionIndex?: number
}

const TOTAL_QUESTIONS = 5

export async function POST(request: Request) {
  const body = (await request.json()) as Body

  if (body.action === "start") {
    const track = body.track ?? "builder"
    const firstQuestion = QUESTION_BANK[track][0]

    return NextResponse.json({
      sessionId: nanoid(10),
      question: firstQuestion,
      questionIndex: 0,
      totalQuestions: TOTAL_QUESTIONS,
      interviewerMessage: `Thanks for joining. You're interviewing for ${body.role || "a builder role"}${body.company ? ` at ${body.company}` : ""}. ${firstQuestion}`,
    })
  }

  if (body.action === "answer") {
    const track = body.track ?? "builder"
    const questionIndex = (body.questionIndex ?? 0) + 1
    const messages: InterviewMessage[] = [
      ...(body.messages ?? []),
      { role: "candidate", content: body.answer ?? "" },
    ]

    if (questionIndex >= TOTAL_QUESTIONS) {
      return NextResponse.json({
        done: true,
        messages,
        questionIndex,
        totalQuestions: TOTAL_QUESTIONS,
      })
    }

    const nextQuestion = QUESTION_BANK[track][questionIndex]
    const followUp = buildFollowUp(body.answer ?? "", nextQuestion)

    return NextResponse.json({
      done: false,
      question: nextQuestion,
      questionIndex,
      totalQuestions: TOTAL_QUESTIONS,
      interviewerMessage: followUp,
      messages: [...messages, { role: "interviewer", content: followUp }],
    })
  }

  if (body.action === "feedback") {
    const track = body.track ?? "builder"
    const messages = body.messages ?? []
    const score = scoreSession(track, messages)
    const tips = buildFeedback(track, score)

    return NextResponse.json({ score, tips })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}

function buildFollowUp(answer: string, nextQuestion: string) {
  const short = answer.trim().split(/\s+/).length < 30
  const prefix = short
    ? "Thanks — can you go a bit deeper on that? "
    : "Good context. Let's keep moving. "
  return `${prefix}${nextQuestion}`
}
