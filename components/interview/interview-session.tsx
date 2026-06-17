"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { GradingScreen } from "@/components/interview/grading-screen"
import { SessionResults } from "@/components/interview/session-results"
import { VoiceInterface } from "@/components/interview/voice-interface"
import { SessionLoading, useClientSession } from "@/hooks/use-client-session"
import { Card, CardContent } from "@/components/ui/card"

export function InterviewSession({ sessionId }: { sessionId: string }) {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get("status")
  const { session, ready, refresh } = useClientSession(sessionId)

  React.useEffect(() => {
    refresh()
  }, [statusParam, refresh])

  if (!ready) {
    return <SessionLoading />
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Session not found.{" "}
          <Link href="/interview" className="underline">
            Start a new interview
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (session.completed && session.score) {
    return <SessionResults sessionId={sessionId} />
  }

  if (statusParam === "grading" || session.status === "grading") {
    return <GradingScreen session={session} />
  }

  if (session.status === "pending" || session.status === "in_progress") {
    return <VoiceInterface session={session} />
  }

  return <SessionResults sessionId={sessionId} />
}
