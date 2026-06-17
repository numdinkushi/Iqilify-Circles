import { NextResponse } from "next/server"

import { convexCreateSession, convexHealthCheck } from "@/lib/convex/server"
import type { InterviewSession } from "@/lib/interview/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { track, role, company, duration, skillLevel, walletAddress } = body

    if (!track || !role) {
      return NextResponse.json({ error: "track and role are required" }, { status: 400 })
    }

    const session: InterviewSession = {
      id: crypto.randomUUID(),
      track,
      role,
      company: company || "circles/garage",
      messages: [],
      questionIndex: 0,
      totalQuestions: 0,
      completed: false,
      debriefUnlocked: false,
      walletAddress,
      createdAt: Date.now(),
      status: "pending",
      duration: duration || 10,
      skillLevel: skillLevel || "intermediate",
      interviewType: track === "behavioral" ? "behavioral" : "technical",
    }

    const convexId = await convexCreateSession({
      sessionId: session.id,
      track: session.track,
      role: session.role,
      company: session.company,
      duration: session.duration,
      skillLevel: session.skillLevel,
      interviewType: session.interviewType,
      walletAddress: session.walletAddress,
      status: session.status,
    })

    return NextResponse.json({
      success: true,
      session,
      convexId,
      convexConnected: !!convexId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start interview" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const health = await convexHealthCheck()
  return NextResponse.json(health)
}
