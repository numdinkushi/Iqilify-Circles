import { NextRequest, NextResponse } from "next/server"

import { gradeInterviewSmart } from "@/lib/interview/ai-grade"
import { resolveMessages, formatMessagesAsTranscript } from "@/lib/interview/grade"
import type { InterviewMessage, InterviewTrack, SkillLevel } from "@/lib/interview/types"
import { extractMessagesFromVapiCall } from "@/lib/vapi/extract-transcript"
import { ServerVapiService } from "@/lib/vapi/server-vapi-service"

type GradeRequest = {
  sessionId?: string
  vapiCallId?: string
  voiceMode?: "vapi" | "browser"
  track?: InterviewTrack
  role?: string
  skillLevel?: SkillLevel
  duration?: number
  createdAt?: number
  messages?: InterviewMessage[]
  transcript?: string
}

async function resolveVapiCallId(body: GradeRequest) {
  if (body.vapiCallId) return body.vapiCallId
  if (body.sessionId && body.voiceMode === "vapi") {
    const vapi = new ServerVapiService()
    const found = await vapi.findCallIdBySessionId(body.sessionId, {
      track: body.track,
      createdAfter: body.createdAt,
    })
    if (found) return found
  }
  return undefined
}

async function resolveInterviewContent(body: GradeRequest) {
  let messages = resolveMessages({
    messages: body.messages,
    transcript: body.transcript,
  })
  let transcript = body.transcript?.trim() || formatMessagesAsTranscript(messages)
  let source: "vapi" | "local" = "local"
  let vapiCallId = body.vapiCallId

  const resolvedCallId = await resolveVapiCallId(body)
  if (resolvedCallId) vapiCallId = resolvedCallId

  if (vapiCallId) {
    const vapi = new ServerVapiService()
    const call = await vapi.getCallWithTranscript(vapiCallId, { attempts: 8, delayMs: 2000 })
    const vapiMessages = extractMessagesFromVapiCall(call)

    if (vapiMessages.length > 0) {
      messages = vapiMessages
      transcript = formatMessagesAsTranscript(vapiMessages)
      source = "vapi"
    }
  }

  return { messages, transcript, source, vapiCallId }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GradeRequest
    const track = body.track || "builder"
    const { messages, transcript, source, vapiCallId } = await resolveInterviewContent(body)

    const result = await gradeInterviewSmart({
      track,
      role: body.role || "this role",
      skillLevel: body.skillLevel || "intermediate",
      messages,
      transcript,
      expectedDurationMinutes: body.duration || 10,
    })

    return NextResponse.json({
      success: true,
      sessionId: body.sessionId,
      vapiCallId,
      score: result.score,
      feedback: result.feedback,
      strengths: result.strengths,
      areasForImprovement: result.areasForImprovement,
      recommendation: result.recommendation,
      transcript,
      gradingSource: result.source,
      transcriptSource: source,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Grading failed" },
      { status: 500 },
    )
  }
}
