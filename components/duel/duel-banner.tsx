"use client"

import { Swords } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TRACK_META } from "@/lib/interview/prompts"
import type { DuelChallenge } from "@/lib/duel/challenge"

export function DuelBanner({ challenge }: { challenge: DuelChallenge }) {
  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="flex items-start gap-3 pt-4">
        <Swords className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Interview duel</p>
            <Badge variant="secondary">{TRACK_META[challenge.track].title}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>{challenge.challengerName}</strong> scored{" "}
            <strong>{challenge.challengerScore}</strong>. Beat them in the same track to win bragging
            rights.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
