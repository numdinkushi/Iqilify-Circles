"use client"

import * as React from "react"

import { AvatarUpload } from "@/components/profile/avatar-upload"
import { DisplayNameField } from "@/components/profile/display-name-field"
import { QuestPanel } from "@/components/quests/quest-panel"
import { ShareKit } from "@/components/share/share-kit"
import { TimelinePanel } from "@/components/progress/timeline-panel"
import { useWallet } from "@/components/wallet/wallet-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { TRACK_META } from "@/lib/interview/prompts"
import type { InterviewTrack } from "@/lib/interview/types"

const DEFAULT_TRACK_KEY = "iqlify:default-track"

export function SettingsPage() {
  const { address, referralSecret } = useWallet()
  const [track, setTrack] = React.useState<InterviewTrack>("builder")

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
      {address ? (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Custom avatar and display name appear on the leaderboard and duel links.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <AvatarUpload address={address} />
            <DisplayNameField address={address} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Connect your Circles wallet to customize your IQlify profile.
          </CardContent>
        </Card>
      )}

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

      {address ? <QuestPanel /> : null}
      {address ? <TimelinePanel /> : null}
      <ShareKit referralSecret={referralSecret} track={track} />
    </div>
  )
}
