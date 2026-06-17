"use client"

import { ProfileAvatar } from "@/components/profile/profile-avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useConvexLeaderboard } from "@/lib/convex/client"
import { TRACK_META } from "@/lib/interview/prompts"
import { shortenAddress } from "@/lib/utils"

export function PublicWinsFeed() {
  const rows = useConvexLeaderboard(5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent wins</CardTitle>
        <CardDescription>Public leaderboard scores — browse without a wallet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No public scores yet. Be the first to unlock a debrief and post.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row._id}
              className="flex items-center justify-between rounded-xl border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  name={row.displayName}
                  address={row.address}
                  avatarUrl={row.avatarUrl}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium">{row.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {TRACK_META[row.track].title} · {shortenAddress(row.address)}
                  </p>
                </div>
              </div>
              <Badge>{row.score}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
