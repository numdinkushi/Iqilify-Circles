"use client"

import { Copy, LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildShareLinks } from "@/lib/share/urls"
import type { InterviewTrack } from "@/lib/interview/types"

type ShareKitProps = {
  referralSecret?: string | null
  track?: InterviewTrack
  compact?: boolean
}

export function ShareKit({ referralSecret, track, compact }: ShareKitProps) {
  const links = buildShareLinks({ referralSecret: referralSecret ?? undefined, track })

  async function copy(url: string, label: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Could not copy link")
    }
  }

  return (
    <Card className={compact ? "border-dashed" : undefined}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-base">Share kit</CardTitle>
        <CardDescription>Circles playground links — copy and send anywhere.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-start justify-between gap-2 rounded-xl border bg-muted/20 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{link.label}</p>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => copy(link.playgroundUrl, link.label)}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ShareKitPending() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Loading share links…
      </CardContent>
    </Card>
  )
}
