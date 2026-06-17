"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TRACK_META } from "@/lib/interview/prompts"
import type { InterviewTrack } from "@/lib/interview/types"

const PREVIEW = {
  score: 84,
  track: "builder" as InterviewTrack,
  name: "Example builder",
  clarity: 86,
  depth: 82,
  structure: 88,
}

export function ScorePreview() {
  const meta = TRACK_META[PREVIEW.track]

  return (
    <Card className="overflow-hidden border-emerald-500/20">
      <CardHeader className="bg-gradient-to-br from-emerald-600/10 to-transparent pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Score preview</CardTitle>
          <Badge variant="secondary">Demo</Badge>
        </div>
        <CardDescription>
          A real wallet replaces this with live scores, CRC rewards, and quests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="text-center">
          <p className="text-4xl font-semibold">{PREVIEW.score}</p>
          <p className="text-sm text-muted-foreground">
            {meta.icon} {meta.title} · {PREVIEW.name}
          </p>
        </div>
        {[
          ["Clarity", PREVIEW.clarity],
          ["Depth", PREVIEW.depth],
          ["Structure", PREVIEW.structure],
        ].map(([label, value]) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{label}</span>
              <span>{value}</span>
            </div>
            <Progress value={Number(value)} />
          </div>
        ))}
        <div className="rounded-xl border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Full AI debrief blurred until you connect and pay 2 CRC — just like a real session.
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link href="/interview">Connect &amp; start for real</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
