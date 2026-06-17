import { NextRequest, NextResponse } from "next/server"

import { GeminiService } from "@/lib/vapi/gemini-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript, role, level, techstack } = body

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ success: false, error: "Transcript is required" }, { status: 400 })
    }

    const gemini = new GeminiService()
    const grading = await gemini.analyzeInterviewTranscript(
      transcript,
      role || "Software Engineer",
      level || "Mid-level",
      techstack || []
    )

    return NextResponse.json({ success: true, grading })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
