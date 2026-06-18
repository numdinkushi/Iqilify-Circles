import { NextRequest, NextResponse } from "next/server"

import { gradeInterview, resolveMessages } from "@/lib/interview/grade"
import type { InterviewMessage, InterviewTrack, SkillLevel } from "@/lib/interview/types"

type GradeRequest = {
  sessionId?: string
  track?: InterviewTrack
  role?: string
  skillLevel?: SkillLevel
  duration?: number
  messages?: InterviewMessage[]
  transcript?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GradeRequest
    const track = body.track || "builder"
    const messages = resolveMessages({
      messages: body.messages,
      transcript: body.transcript,
    })

    const result = gradeInterview({
      track,
      messages,
      skillLevel: body.skillLevel,
      expectedDurationMinutes: body.duration || 10,
    })

    return NextResponse.json({
      success: true,
      sessionId: body.sessionId,
      score: result.score,
      feedback: result.feedback,
      strengths: result.strengths,
      areasForImprovement: result.areasForImprovement,
      recommendation: result.recommendation,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Grading failed" },
      { status: 500 },
    )
  }
}
