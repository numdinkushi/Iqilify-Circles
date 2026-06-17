"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConvexLeaderboard } from "@/lib/convex/client"
import { loadLeaderboard } from "@/lib/interview/storage"
import { TRACK_META } from "@/lib/interview/prompts"
import type { LeaderboardEntry } from "@/lib/interview/types"
import { shortenAddress } from "@/lib/utils"

export function LeaderboardPage() {
  const convexEntries = useConvexLeaderboard(50)
  const [localEntries, setLocalEntries] = React.useState<LeaderboardEntry[]>([])

  React.useEffect(() => {
    setLocalEntries(loadLeaderboard())
  }, [])

  const entries: LeaderboardEntry[] =
    convexEntries && convexEntries.length > 0
      ? convexEntries.map((row) => ({
          id: row._id,
          address: row.address,
          displayName: row.displayName,
          track: row.track,
          score: row.score,
          sessionId: row.sessionId,
          createdAt: row.createdAt,
        }))
      : localEntries

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Leaderboard
            {convexEntries ? (
              <Badge variant="secondary" className="text-[10px]">
                Convex live
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scores yet. Complete an interview and unlock your debrief with CRC to appear here.
            </p>
          ) : (
            entries.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl border px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{entry.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRACK_META[entry.track].title} · {shortenAddress(entry.address)}
                    </p>
                  </div>
                </div>
                <Badge>{entry.score}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
