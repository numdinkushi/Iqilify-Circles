"use client"

import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getDirectAppUrl, voiceBlockedInEmbedMessage } from "@/lib/embed/microphone"

export function VoiceEmbedNotice({ href }: { href?: string }) {
  const directUrl = href ?? getDirectAppUrl()

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">Voice isn&apos;t available in the Circles playground</p>
      <p className="mt-1 text-muted-foreground">{voiceBlockedInEmbedMessage()}</p>
      <Button asChild size="sm" className="mt-3">
        <a href={directUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" />
          Open for voice interview
        </a>
      </Button>
    </div>
  )
}
