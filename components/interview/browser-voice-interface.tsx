"use client"

import * as React from "react"
import { LoaderCircle, Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { listenOnce, speak, stopSpeaking } from "@/lib/interview/browser-voice"
import { useSyncSessionToConvex } from "@/lib/convex/client"
import { saveSession } from "@/lib/interview/storage"
import { TRACK_META } from "@/lib/interview/prompts"
import type { InterviewMessage, InterviewSession } from "@/lib/interview/types"

type Status = "connecting" | "connected" | "listening" | "speaking" | "error"

function buildTranscript(messages: InterviewMessage[]) {
  return messages
    .map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n")
}

export function BrowserVoiceInterface({
  session,
  fallbackReason,
}: {
  session: InterviewSession
  fallbackReason?: string
}) {
  const router = useRouter()
  const { syncSession } = useSyncSessionToConvex()
  const [status, setStatus] = React.useState<Status>("connecting")
  const [messages, setMessages] = React.useState<InterviewMessage[]>([])
  const [turnIndex, setTurnIndex] = React.useState(0)
  const [timeRemaining, setTimeRemaining] = React.useState(session.duration * 60)
  const [isMuted, setIsMuted] = React.useState(false)
  const [speakerOn, setSpeakerOn] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [hasEnded, setHasEnded] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const runningRef = React.useRef(false)
  const messagesRef = React.useRef<InterviewMessage[]>([])

  const maxTurns = Math.max(4, Math.min(8, Math.floor(session.duration / 2)))

  const finishInterview = React.useCallback(
    (finalMessages: InterviewMessage[]) => {
      if (hasEnded) return
      setHasEnded(true)
      runningRef.current = false
      stopSpeaking()
      if (timerRef.current) clearInterval(timerRef.current)

      const transcript = buildTranscript(finalMessages)
      const next: InterviewSession = {
        ...session,
        status: "grading",
        voiceMode: "browser",
        localTranscript: transcript,
        messages: finalMessages,
      }
      saveSession(next)
      void syncSession(next)
      router.replace(`/interview/${session.id}?status=grading`)
    },
    [hasEnded, router, session, syncSession]
  )

  const fetchTurn = React.useCallback(
    async (currentMessages: InterviewMessage[], index: number) => {
      const res = await fetch("/api/interview/voice-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: session.track,
          role: session.role,
          company: session.company,
          skillLevel: session.skillLevel,
          messages: currentMessages,
          turnIndex: index,
          maxTurns,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not get interviewer question")
      }
      return data
    },
    [maxTurns, session]
  )

  const runLoop = React.useCallback(async () => {
    if (runningRef.current || hasEnded) return
    runningRef.current = true
    setStatus("connecting")
    setError(null)

    let currentMessages: InterviewMessage[] = []
    let index = 0

    try {
      saveSession({ ...session, status: "in_progress", voiceMode: "browser" })
      setStatus("connected")

      while (index < maxTurns && timeRemaining > 0) {
        const turn = await fetchTurn(currentMessages, index)
        if (turn.done) break

        const interviewerLine = turn.interviewerMessage as string
        currentMessages = turn.messages as InterviewMessage[]
        messagesRef.current = currentMessages
        setMessages(currentMessages)
        setTurnIndex(index)

        setStatus("speaking")
        await speak(interviewerLine, speakerOn && !isMuted)

        setStatus("listening")
        const answer = await listenOnce(20000)
        if (!answer.trim()) {
          toast.message("No speech detected — trying again")
          continue
        }

        currentMessages = [...currentMessages, { role: "candidate", content: answer }]
        messagesRef.current = currentMessages
        setMessages(currentMessages)
        index += 1
        setTurnIndex(index)
      }

      finishInterview(currentMessages)
    } catch (err) {
      runningRef.current = false
      const message = err instanceof Error ? err.message : "Voice interview failed"
      setError(message)
      setStatus("error")
      toast.error(message)
    }
  }, [fetchTurn, finishInterview, hasEnded, isMuted, maxTurns, session, speakerOn, timeRemaining])

  React.useEffect(() => {
    runLoop()
    return () => {
      stopSpeaking()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (hasEnded) return
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          finishInterview(messagesRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [finishInterview, hasEnded])

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const progress = ((session.duration * 60 - timeRemaining) / (session.duration * 60)) * 100

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="size-4" />
            {TRACK_META[session.track].title} · Browser voice mode
          </CardTitle>
          <CardDescription>
            {session.role} · {session.skillLevel} · {session.duration} min
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fallbackReason ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
              {fallbackReason}
            </p>
          ) : null}

          <div className="flex items-center justify-between">
            <Badge variant="secondary">{status}</Badge>
            <span className="font-mono text-sm">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
          <Progress value={progress} />

          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border bg-muted/30 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Starting interview…</p>
            ) : (
              messages.map((m, i) => (
                <p key={i} className="text-sm">
                  <span className="font-medium">
                    {m.role === "interviewer" ? "Interviewer" : "You"}:
                  </span>{" "}
                  {m.content}
                </p>
              ))
            )}
          </div>

          {status === "listening" ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-600">
              <LoaderCircle className="size-4 animate-spin" />
              Listening… speak your answer
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  runningRef.current = false
                  runLoop()
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <MicOff /> : <Mic />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="outline" onClick={() => setSpeakerOn(!speakerOn)}>
              {speakerOn ? <Volume2 /> : <VolumeX />}
              Speaker
            </Button>
            <Button variant="destructive" onClick={() => finishInterview(messagesRef.current)}>
              <PhoneOff />
              End call
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
