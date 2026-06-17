"use client"

import * as React from "react"
import { Copy, LoaderCircle, Trophy } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  buildDuelPlaygroundUrl,
  duelOutcome,
  type DuelChallenge,
} from "@/lib/duel/challenge"
import { TRACK_META } from "@/lib/interview/prompts"
import { markQuestFlag } from "@/lib/quests/evaluate"
import { buildOgImageUrl, buildScoreShareText } from "@/lib/share/urls"
import type { InterviewTrack } from "@/lib/interview/types"

type DuelResultProps = {
  challenge: DuelChallenge | null
  yourScore: number
  track: InterviewTrack
  displayName: string
  challengerAddress: string
  sessionId: string
  onChallengeSent?: () => void
}

export function DuelResultCard({
  challenge,
  yourScore,
  track,
  displayName,
  challengerAddress,
  sessionId,
  onChallengeSent,
}: DuelResultProps) {
  const [sharing, setSharing] = React.useState(false)

  async function shareChallenge() {
    setSharing(true)
    try {
      const duel = buildDuelPlaygroundUrl({
        challengerAddress,
        challengerName: displayName,
        challengerScore: yourScore,
        track,
        sessionId,
      })
      await navigator.clipboard.writeText(duel)
      markQuestFlag(challengerAddress, "duel_challenge")
      onChallengeSent?.()
      toast.success("Duel link copied — friend opens it in Circles to accept")
    } catch {
      toast.error("Could not copy duel link")
    } finally {
      setSharing(false)
    }
  }

  async function shareScoreCard() {
    const og = buildOgImageUrl({ score: yourScore, track, name: displayName })
    const text = buildScoreShareText({ score: yourScore, track, displayName })
    try {
      await navigator.clipboard.writeText(`${text}\n${og}`)
      toast.success("Score share text copied (includes OG preview URL)")
    } catch {
      toast.error("Could not copy")
    }
  }

  if (challenge) {
    const outcome = duelOutcome(challenge, yourScore)
    return (
      <Card
        className={
          outcome === "win"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : outcome === "lose"
              ? "border-rose-500/30 bg-rose-500/5"
              : "border-amber-500/30 bg-amber-500/5"
        }
      >
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-4" />
            <p className="text-sm font-semibold">
              {outcome === "win"
                ? "You won the duel!"
                : outcome === "lose"
                  ? "They edged you this time"
                  : "It's a tie!"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            You: <strong>{yourScore}</strong> vs {challenge.challengerName}:{" "}
            <strong>{challenge.challengerScore}</strong> · {TRACK_META[track].title}
          </p>
          <Button className="w-full" variant="outline" onClick={shareChallenge} disabled={sharing}>
            {sharing ? <LoaderCircle className="animate-spin" /> : <Copy />}
            Challenge someone else
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Challenge a friend</Badge>
          <p className="text-sm text-muted-foreground">Stake bragging rights on your score.</p>
        </div>
        <Button className="w-full" onClick={shareChallenge} disabled={sharing}>
          {sharing ? <LoaderCircle className="animate-spin" /> : <Copy />}
          Copy duel link
        </Button>
        <Button className="w-full" variant="outline" onClick={shareScoreCard}>
          Share score card
        </Button>
      </CardContent>
    </Card>
  )
}
