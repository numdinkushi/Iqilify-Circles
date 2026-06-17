"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTimeline } from "@/hooks/use-timeline"

export function TimelinePanel() {
  const { events, formatWhen } = useTimeline()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Progress timeline</CardTitle>
        <CardDescription>Private history stored in this browser for your wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete an interview to start your timeline.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.slice(0, 8).map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  {formatWhen(event.createdAt)}
                </span>
                <div>
                  <p className="font-medium">{event.title}</p>
                  {event.detail ? (
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
