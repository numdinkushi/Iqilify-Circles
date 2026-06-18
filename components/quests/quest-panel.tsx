"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useQuests } from "@/hooks/use-quests"

export function QuestPanel() {
  const { items, summary, tier } = useQuests()
  const pct = summary.totalXp > 0 ? Math.round((summary.earnedXp / summary.totalXp) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>Quests · {summary.earnedXp} XP</span>
          <Badge variant="secondary" className={tier.color}>
            {tier.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          {summary.completedQuests}/{summary.totalQuests} complete · verifiable from your sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Builder readiness</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <div className="space-y-2">
          {items.map((quest) => (
            <div
              key={quest.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                quest.done ? "border-emerald-500/30 bg-emerald-500/5" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden>{quest.icon}</span>
                <div>
                  <p className="font-medium">{quest.title}</p>
                  <p className="text-xs text-muted-foreground">{quest.description}</p>
                </div>
              </div>
              <Badge variant={quest.done ? "default" : "outline"}>
                {quest.done ? `+${quest.xp}` : quest.xp}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
