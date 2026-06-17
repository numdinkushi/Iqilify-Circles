"use client"

import * as React from "react"

import { loadSession } from "@/lib/interview/storage"
import type { InterviewSession } from "@/lib/interview/types"

export function useClientSession(sessionId: string) {
  const [session, setSession] = React.useState<InterviewSession | null>(null)
  const [ready, setReady] = React.useState(false)

  const refresh = React.useCallback(() => {
    setSession(loadSession(sessionId))
  }, [sessionId])

  React.useEffect(() => {
    setSession(loadSession(sessionId))
    setReady(true)
  }, [sessionId])

  return { session, ready, refresh, setSession }
}

export function SessionLoading() {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      Loading session…
    </div>
  )
}
