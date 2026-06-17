"use client"

import * as React from "react"
import { Copy, LoaderCircle, Trophy } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { useWallet } from "@/components/wallet/wallet-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getSdk, payForDebrief } from "@/lib/circles"
import { buildReferralShareUrl, createReferralLink } from "@/lib/referrals"
import { DEBRIEF_COST_CRC, TRACK_META } from "@/lib/interview/prompts"
import { buildFeedback } from "@/lib/interview/scoring"
import { SessionLoading, useClientSession } from "@/hooks/use-client-session"
import { useAddLeaderboardToConvex, useSyncSessionToConvex } from "@/lib/convex/client"
import { addLeaderboardEntry, saveSession } from "@/lib/interview/storage"
import type { InterviewSession } from "@/lib/interview/types"

const ORG_ADDRESS = process.env.NEXT_PUBLIC_IQLIFY_ORG_ADDRESS

export function SessionResults({ sessionId }: { sessionId: string }) {
  const { address, isMiniappHost } = useWallet()
  const { session, ready, setSession } = useClientSession(sessionId)
  const { syncSession } = useSyncSessionToConvex()
  const addToConvexLeaderboard = useAddLeaderboardToConvex()
  const [paying, setPaying] = React.useState(false)
  const [inviting, setInviting] = React.useState(false)
  const [displayName, setDisplayName] = React.useState("Anonymous builder")

  React.useEffect(() => {
    if (!address) return
    getSdk()
      .then((sdk) => sdk.rpc.profile.getProfileView(address as `0x${string}`))
      .then((view) => {
        const profileName = view.profile?.name
        if (profileName) setDisplayName(profileName)
      })
      .catch(() => undefined)
  }, [address])

  if (!ready) {
    return <SessionLoading />
  }

  if (!session?.score) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Session not found.{" "}
          <Link href="/interview" className="underline">
            Start a new interview
          </Link>
        </CardContent>
      </Card>
    )
  }

  const tips =
    session.areasForImprovement && session.areasForImprovement.length > 0
      ? session.areasForImprovement
      : buildFeedback(session.track, session.score)
  const locked = !session.debriefUnlocked
  const previewTip = session.feedback || tips[0]

  async function unlockDebrief() {
    if (!session?.score || !address || !ORG_ADDRESS) {
      toast.error("Set NEXT_PUBLIC_IQLIFY_ORG_ADDRESS to enable CRC unlocks")
      return
    }

    setPaying(true)
    try {
      await payForDebrief({
        from: address,
        to: ORG_ADDRESS,
        amountCrc: DEBRIEF_COST_CRC,
        sessionId: session.id,
      })

      const next: InterviewSession = { ...session, debriefUnlocked: true }
      setSession(next)
      saveSession(next)
      void syncSession(next)

      addLeaderboardEntry({
        id: crypto.randomUUID(),
        address,
        displayName,
        track: session.track,
        score: session.score.overall,
        sessionId: session.id,
        createdAt: Date.now(),
      })

      void addToConvexLeaderboard({
        sessionId: session.id,
        address,
        displayName,
        track: session.track,
        score: session.score.overall,
      })

      toast.success("Full debrief unlocked — you are on the leaderboard")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed")
    } finally {
      setPaying(false)
    }
  }

  async function shareInvite() {
    if (!address) {
      toast.error("Connect your Circles account first")
      return
    }
    if (!isMiniappHost) {
      toast.error("Open IQlify inside the Circles app to create referral links")
      return
    }

    setInviting(true)
    try {
      const secret = await createReferralLink(address as `0x${string}`)
      const url = buildReferralShareUrl(secret)
      await navigator.clipboard.writeText(url)
      toast.success("Invite link copied — friend opens it in Circles to create a wallet")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invite")
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-emerald-600" />
            Interview complete
          </CardTitle>
          <CardDescription>
            {TRACK_META[session.track].title} · {session.role}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-5xl font-semibold tracking-tight">{session.score.overall}</p>
            <p className="text-sm text-muted-foreground">Overall score</p>
          </div>

          <div className="space-y-3">
            {[
              ["Clarity", session.score.clarity],
              ["Depth", session.score.depth],
              ["Structure", session.score.structure],
              ...(session.score.circlesFit
                ? [["Circles fit", session.score.circlesFit] as [string, number]]
                : []),
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <Progress value={Number(value)} />
              </div>
            ))}
          </div>

          {session.strengths && session.strengths.length > 0 ? (
            <div className="space-y-2 rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Strengths</p>
              <ul className="space-y-1 text-sm">
                {session.strengths.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {locked ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-muted-foreground">Preview: {previewTip}</p>
                <p className="text-sm">
                  Unlock the full AI debrief and post your score to the leaderboard for{" "}
                  <strong>{DEBRIEF_COST_CRC} CRC</strong>.
                </p>
                {!ORG_ADDRESS ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Set NEXT_PUBLIC_IQLIFY_ORG_ADDRESS in .env.local to enable CRC payments.
                  </p>
                ) : null}
                <Button className="w-full" onClick={unlockDebrief} disabled={paying || !ORG_ADDRESS}>
                  {paying ? <LoaderCircle className="animate-spin" /> : null}
                  Pay {DEBRIEF_COST_CRC} CRC · unlock debrief
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 rounded-2xl border bg-emerald-500/5 p-4">
              <Badge className="bg-emerald-600 text-white">Debrief unlocked</Badge>
              <ul className="space-y-2 text-sm">
                {tips.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={shareInvite}
            disabled={inviting || !address}
          >
            {inviting ? <LoaderCircle className="animate-spin" /> : <Copy />}
            {inviting ? "Creating invite…" : "Invite a friend (Circles referral)"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Uses Circles referral secrets — costs invitation quota (~96 CRC) per new wallet.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
