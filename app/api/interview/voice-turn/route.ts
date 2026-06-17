import { NextRequest, NextResponse } from "next/server"

import { buildLocalInterviewerLine, buildVoiceTurnResponse, type VoiceTurnInput } from "@/lib/interview/voice-turn-local"
import { isGeminiVoiceTurnsEnabled } from "@/lib/vapi/config"
import { GeminiService } from "@/lib/vapi/gemini-service"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VoiceTurnInput

    if (!isGeminiVoiceTurnsEnabled()) {
      return NextResponse.json(buildVoiceTurnResponse(body))
    }

    const maxTurns = body.maxTurns ?? 6
    const turnIndex = body.turnIndex ?? 0

    if (turnIndex >= maxTurns) {
      return NextResponse.json(buildVoiceTurnResponse(body))
    }

    try {
      const gemini = new GeminiService()
      const seedQuestion = buildLocalInterviewerLine({ ...body, turnIndex })
      const history = body.messages
        .map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`)
        .join("\n")

      const prompt = `You are a concise voice interviewer for IQlify.
Role: ${body.role}
Company: ${body.company || "tech company"}
Track: ${body.track}
Level: ${body.skillLevel || "intermediate"}

Conversation:
${history || "(just starting)"}

Base your next spoken line on this guidance: ${seedQuestion}

Write ONLY the next interviewer line (1-3 short sentences). No labels.`

      const interviewerMessage = await gemini.generateInterviewerLine(prompt)
      const messages = [...body.messages, { role: "interviewer" as const, content: interviewerMessage }]

      return NextResponse.json({
        done: false,
        interviewerMessage,
        messages,
        turnIndex,
        source: "gemini",
      })
    } catch {
      return NextResponse.json(buildVoiceTurnResponse(body))
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Voice turn failed" },
      { status: 500 }
    )
  }
}
