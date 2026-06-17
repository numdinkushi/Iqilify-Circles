import { NextRequest, NextResponse } from "next/server"

import { getGrading, storeGrading } from "@/lib/vapi/grading-store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get("callId")
    const sessionId = searchParams.get("sessionId")
    const gradingId = searchParams.get("gradingId")

    const ids = [gradingId, callId, sessionId].filter(Boolean) as string[]
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    for (const id of ids) {
      const record = getGrading(id)
      if (record) {
        return NextResponse.json({
          success: true,
          gradingResults: record.gradingResults,
          callId: record.callId || callId || id,
        })
      }
    }

    return NextResponse.json({
      success: true,
      gradingResults: null,
      callId: callId || sessionId,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId, sessionId, gradingResults, timestamp } = body

    if (!callId && !sessionId) {
      return NextResponse.json({ success: false, error: "Call ID or Session ID is required" }, { status: 400 })
    }

    const id = callId || sessionId
    storeGrading(id, gradingResults, { callId, sessionId })

    return NextResponse.json({
      success: true,
      message: "Grading results stored successfully",
      gradingId: id,
      timestamp: timestamp || new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
