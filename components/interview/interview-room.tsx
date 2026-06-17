"use client"

import * as React from "react"
import { LoaderCircle, Mic } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CreateAccountButton } from "@/components/wallet/create-account-button"
import { useWallet } from "@/components/wallet/wallet-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEBRIEF_COST_CRC, TRACK_META } from "@/lib/interview/prompts"
import { isVapiCallsEnabled } from "@/lib/vapi/feature-flags"
import { saveSession } from "@/lib/interview/storage"
import type { InterviewTrack, SkillLevel } from "@/lib/interview/types"

const DURATIONS = [5, 10, 15] as const
const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

export function InterviewRoom() {
  const router = useRouter()
  const { address, isConnected, isMiniappHost } = useWallet()
  const [track, setTrack] = React.useState<InterviewTrack>("builder")
  const [role, setRole] = React.useState("Circles mini-app builder")
  const [company, setCompany] = React.useState("circles/garage")
  const [duration, setDuration] = React.useState<number>(10)
  const [skillLevel, setSkillLevel] = React.useState<SkillLevel>("intermediate")
  const [loading, setLoading] = React.useState(false)
  const [referrer, setReferrer] = React.useState<string | null>(null)

  const canStart = isConnected || !isMiniappHost

  React.useEffect(() => {
    const saved = window.localStorage.getItem("iqlify:default-track") as InterviewTrack | null
    if (saved && saved in TRACK_META) setTrack(saved)

    const params = new URLSearchParams(window.location.search)
    const ref = params.get("ref")
    if (ref) setReferrer(ref)
  }, [])

  async function startInterview() {
    if (!canStart) {
      toast.error("Connect your Circles account first")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/interviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track,
          role,
          company,
          duration,
          skillLevel,
          walletAddress: address ?? undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Could not create session")
      }

      const data = await response.json()
      saveSession(data.session)
      window.localStorage.setItem("iqlify:default-track", track)
      router.push(`/interview/${data.session.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start interview")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="size-4" />
            Start a voice interview
          </CardTitle>
          <CardDescription>
            {isVapiCallsEnabled()
              ? `Practice with a live AI interviewer via Vapi. Get scored feedback and unlock your full debrief for ${DEBRIEF_COST_CRC} CRC.`
              : `Browser voice interview (no Vapi credits needed). Get scored feedback and unlock your full debrief for ${DEBRIEF_COST_CRC} CRC.`}
          </CardDescription>
        </CardHeader>
      </Card>

      {isMiniappHost && !isConnected ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Connect your Circles account to bind sessions to your wallet.
            </p>
            <CreateAccountButton />
          </CardContent>
        </Card>
      ) : !isMiniappHost ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          Standalone mode — interviews work without a wallet. Open inside Circles to enable CRC
          debrief payments.
        </p>
      ) : referrer ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-muted-foreground">
          Invited by <span className="font-mono">{referrer}</span> — complete a session to count
          toward referrals.
        </p>
      ) : null}

      <div className="grid gap-3">
        {(Object.keys(TRACK_META) as InterviewTrack[]).map((key) => {
          const meta = TRACK_META[key]
          const active = track === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTrack(key)}
              className={`rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{meta.icon}</span>
                <div>
                  <p className="font-medium">{meta.title}</p>
                  <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company / context</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Skill level</Label>
          <div className="flex flex-wrap gap-2">
            {SKILL_LEVELS.map((level) => (
              <Button
                key={level.value}
                type="button"
                size="sm"
                variant={skillLevel === level.value ? "default" : "outline"}
                onClick={() => setSkillLevel(level.value)}
              >
                {level.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((mins) => (
              <Button
                key={mins}
                type="button"
                size="sm"
                variant={duration === mins ? "default" : "outline"}
                onClick={() => setDuration(mins)}
              >
                {mins} min
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <Badge variant="secondary" className="mb-2">
          Microphone required
        </Badge>
        <p>
          You&apos;ll speak with an AI interviewer in real time. Grant mic access when prompted.
        </p>
      </div>

      <Button className="w-full" onClick={startInterview} disabled={loading || !canStart}>
        {loading ? <LoaderCircle className="animate-spin" /> : <Mic />}
        Begin voice interview
      </Button>
    </div>
  )
}
