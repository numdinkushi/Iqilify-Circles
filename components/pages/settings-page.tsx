"use client"

import * as React from "react"
import { useQuery } from "convex/react"

import { isConvexConfigured } from "@/components/providers/convex-provider"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { api } from "@/convex/_generated/api"
import { TRACK_META } from "@/lib/interview/prompts"
import type { InterviewTrack } from "@/lib/interview/types"

const DEFAULT_TRACK_KEY = "iqlify:default-track"

export function SettingsPage() {
  const [track, setTrack] = React.useState<InterviewTrack>("builder")
  const convexHealth = useQuery(
    api.sessions.health,
    isConvexConfigured() ? {} : "skip"
  )

  React.useEffect(() => {
    const saved = window.localStorage.getItem(DEFAULT_TRACK_KEY) as InterviewTrack | null
    if (saved && saved in TRACK_META) setTrack(saved)
  }, [])

  function saveTrack(value: InterviewTrack) {
    setTrack(value)
    window.localStorage.setItem(DEFAULT_TRACK_KEY, value)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Defaults for your next practice session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default interview track</Label>
            <div className="grid gap-2">
              {(Object.keys(TRACK_META) as InterviewTrack[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => saveTrack(key)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm ${track === key ? "border-primary bg-primary/5" : ""}`}
                >
                  {TRACK_META[key].icon} {TRACK_META[key].title}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            Convex backend:{" "}
            {convexHealth?.ok ? (
              <Badge variant="secondary">Connected</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </p>
          {process.env.NEXT_PUBLIC_CONVEX_URL ? (
            <p className="break-all font-mono text-xs">{process.env.NEXT_PUBLIC_CONVEX_URL}</p>
          ) : null}
          <p>
            Built for circles/garage. Submissions need a live URL — test in the{" "}
            <a
              href="https://circles.gnosis.io/playground"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Circles playground
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
