"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePublicStats } from "@/hooks/use-public-stats"

export function LiveStatsBar() {
  const stats = usePublicStats()

  const items = [
    { label: "Site opens", value: stats.siteOpens },
    { label: "Profiles", value: stats.profilesRead },
    { label: "Referrals", value: stats.referralsCopied },
    { label: "Interviews", value: stats.interviewsCompleted },
  ]

  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Live activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {items.map((item) => (
            <div key={item.label}>
              <p className="text-lg font-semibold tabular-nums">{item.value}</p>
              <p className="text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
