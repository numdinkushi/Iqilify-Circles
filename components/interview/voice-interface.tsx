"use client"

import * as React from "react"
import {
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { BrowserVoiceInterface } from "@/components/interview/browser-voice-interface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getAssistantIdForTrack, VapiService } from "@/lib/vapi-service"
import { BROWSER_VOICE_REASON, isVapiCallsEnabled } from "@/lib/vapi/feature-flags"
import { isVapiBillingError, parseVapiError } from "@/lib/vapi/parse-error"
import { saveSession } from "@/lib/interview/storage"
import { TRACK_META } from "@/lib/interview/prompts"
import type { InterviewSession } from "@/lib/interview/types"

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

export function VoiceInterface({ session }: { session: InterviewSession }) {
  const router = useRouter()
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>("connecting")
  const [isMuted, setIsMuted] = React.useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = React.useState(true)
  const [timeRemaining, setTimeRemaining] = React.useState(session.duration * 60)
  const [isActive, setIsActive] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const vapiEnabled = isVapiCallsEnabled()
  const [fallbackReason, setFallbackReason] = React.useState<string | null>(
    vapiEnabled ? null : BROWSER_VOICE_REASON
  )
  const [useBrowserFallback, setUseBrowserFallback] = React.useState(
    !vapiEnabled || session.voiceMode === "browser"
  )
  const [hasEnded, setHasEnded] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = React.useRef(false)

  React.useEffect(() => {
    if (session.voiceMode === "browser") {
      setUseBrowserFallback(true)
    }
  }, [session.voiceMode])

  const switchToBrowser = React.useCallback((reason: string) => {
    setUseBrowserFallback(true)
    setFallbackReason(reason)
    toast.message("Using browser voice mode", {
      description: "Local questions + browser speech — no Vapi call needed.",
    })
  }, [])

  const endInterview = React.useCallback(async () => {
    if (hasEnded) return
    setHasEnded(true)
    setIsActive(false)
    if (timerRef.current) clearInterval(timerRef.current)

    const callId = VapiService.getInstance().getActiveCallId()
    const next: InterviewSession = {
      ...session,
      status: "grading",
      vapiCallId: callId || session.vapiCallId,
    }
    saveSession(next)
    router.replace(`/interview/${session.id}?status=grading`)
  }, [hasEnded, router, session])

  const handleVapiError = React.useCallback(
    (err: unknown) => {
      startedRef.current = false
      const message = parseVapiError(err)

      if (isVapiBillingError(message)) {
        switchToBrowser(BROWSER_VOICE_REASON)
        return
      }

      setError(message)
      setConnectionStatus("error")
      toast.error(message)
    },
    [switchToBrowser]
  )

  const startCall = React.useCallback(async () => {
    if (hasEnded || startedRef.current || useBrowserFallback) return
    startedRef.current = true

    try {
      setConnectionStatus("connecting")
      setError(null)

      const assistantId = getAssistantIdForTrack(session.track)
      if (!assistantId) {
        throw new Error(
          "VAPI assistant ID is not configured. Set NEXT_PUBLIC_VAPI_TECHNICAL_ASSISTANT_ID in .env"
        )
      }

      const vapi = VapiService.getInstance()
      const timeout = setTimeout(() => {
        setError("Connection timeout. Check microphone permissions and try again.")
        setConnectionStatus("error")
        startedRef.current = false
      }, 120000)

      const call = await vapi.startCall({
        assistantId,
        duration: session.duration,
        role: session.role,
        company: session.company,
        track: session.track,
        skillLevel: session.skillLevel,
        onCallStart: (callId) => {
          clearTimeout(timeout)
          setConnectionStatus("connected")
          setIsActive(true)
          saveSession({
            ...session,
            status: "in_progress",
            voiceMode: "vapi",
            vapiCallId: callId,
          })
        },
        onCallEnd: () => {
          clearTimeout(timeout)
          endInterview()
        },
        onError: (err: unknown) => {
          clearTimeout(timeout)
          handleVapiError(err)
        },
      })

      const callId = call?.id || vapi.getActiveCallId()
      if (callId) {
        saveSession({
          ...session,
          status: "in_progress",
          voiceMode: "vapi",
          vapiCallId: callId,
        })
      }
    } catch (err) {
      handleVapiError(err)
    }
  }, [endInterview, handleVapiError, hasEnded, session, useBrowserFallback])

  React.useEffect(() => {
    if (useBrowserFallback || hasEnded || session.status === "grading" || session.status === "completed") {
      return
    }
    startedRef.current = false
    startCall()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [hasEnded, session.status, startCall, useBrowserFallback])

  React.useEffect(() => {
    if (!isActive || timeRemaining <= 0) return
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          endInterview()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [endInterview, isActive, timeRemaining])

  async function handleEndCall() {
    try {
      await VapiService.getInstance().endCall()
    } finally {
      endInterview()
    }
  }

  function toggleMute() {
    const next = !isMuted
    setIsMuted(next)
    VapiService.getInstance().setMuted(next)
  }

  if (useBrowserFallback) {
    return (
      <BrowserVoiceInterface
        session={session}
        fallbackReason={fallbackReason ?? undefined}
      />
    )
  }

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const progress = ((session.duration * 60 - timeRemaining) / (session.duration * 60)) * 100

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="size-4" />
            {TRACK_META[session.track].title} · Voice interview
          </CardTitle>
          <CardDescription>
            {session.role} · {session.skillLevel} · {session.duration} min
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant={connectionStatus === "connected" ? "default" : "secondary"}>
              {connectionStatus === "connected" ? (
                <Wifi className="mr-1 size-3" />
              ) : (
                <WifiOff className="mr-1 size-3" />
              )}
              {connectionStatus}
            </Badge>
            <span className="font-mono text-sm">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
          <Progress value={progress} />

          {connectionStatus === "connecting" ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Connecting to AI interviewer…
            </div>
          ) : (
            <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Speak naturally — the AI interviewer will ask questions and respond in real time.
              Grant microphone access when prompted.
            </p>
          )}

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    startedRef.current = false
                    startCall()
                  }}
                >
                  Retry Vapi
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    switchToBrowser("Switched to browser voice mode after Vapi connection failed.")
                  }
                >
                  Use browser voice
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={toggleMute}>
              {isMuted ? <MicOff /> : <Mic />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="outline" onClick={() => setIsSpeakerOn(!isSpeakerOn)}>
              {isSpeakerOn ? <Volume2 /> : <VolumeX />}
              Speaker
            </Button>
            <Button variant="destructive" onClick={handleEndCall}>
              <PhoneOff />
              End call
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
