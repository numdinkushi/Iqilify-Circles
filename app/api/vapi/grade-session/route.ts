import { NextRequest, NextResponse } from "next/server"

import { gradeFromCallData } from "@/lib/vapi/grade-call"
import { storeGrading } from "@/lib/vapi/grading-store"
import { ServerVapiService } from "@/lib/vapi/server-vapi-service"

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, vapiCallId, role, skillLevel, duration, interviewType, transcript, track } =
      body

    if (!sessionId && !vapiCallId && !transcript) {
      return NextResponse.json({ success: false, error: "sessionId or vapiCallId required" }, { status: 400 })
    }

    if (transcript && typeof transcript === "string" && transcript.trim().length > 0) {
      const { gradeFromTranscript } = await import("@/lib/vapi/grade-call")
      const grading = await gradeFromTranscript(sessionId || vapiCallId || "browser", transcript, {
        role,
        skillLevel,
        expectedDurationMinutes: duration || 10,
        interviewType,
        track,
      })
      storeGrading(sessionId || vapiCallId || "browser", grading, { sessionId, callId: vapiCallId })
      return NextResponse.json({ success: true, gradingResults: grading, sessionId })
    }

    const callId = vapiCallId
    if (!callId || !isValidUUID(callId)) {
      return NextResponse.json({
        success: true,
        gradingResults: {
          overallScore: 0,
          summary: "Interview ended before a call connection was established. Please try again and grant microphone access.",
          keyHighlights: [],
          areasForImprovement: ["Ensure microphone permissions are granted", "Wait for the connected status before speaking"],
          recommendation: "retry",
          isFailedInterview: true,
        },
        sessionId,
      })
    }

    const vapi = new ServerVapiService()
    const callData = await vapi.getCall(callId)
    const grading = await gradeFromCallData(callId, callData, {
      role,
      skillLevel,
      expectedDurationMinutes: duration || 10,
      interviewType,
      track,
    })

    storeGrading(callId, grading, { callId, sessionId })

    return NextResponse.json({
      success: true,
      gradingResults: grading,
      sessionId,
      callId,
    })
  } catch (error) {
    console.error("Grade session error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Grading failed" },
      { status: 500 }
    )
  }
}
