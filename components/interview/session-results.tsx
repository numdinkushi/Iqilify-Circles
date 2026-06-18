"use client"

import * as React from "react"
import { Copy, LoaderCircle, Trophy } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { DuelResultCard } from "@/components/duel/duel-result"
import { ProfileAvatar } from "@/components/profile/profile-avatar"
import { useWallet } from "@/components/wallet/wallet-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useBumpStat } from "@/hooks/use-bump-stat"
import { useDuelChallenge } from "@/hooks/use-duel-challenge"
import { useProfile } from "@/hooks/use-profile"
import { useQuests } from "@/hooks/use-quests"
import { SessionLoading, useClientSession } from "@/hooks/use-client-session"
import { useAddLeaderboardToConvex, useSyncSessionToConvex } from "@/lib/convex/client"
import { getSdk, payForDebrief } from "@/lib/circles"
import { buildReferralShareUrl, createReferralLink, invalidateReferralStatsCache } from "@/lib/referrals"
import { DEBRIEF_COST_CRC, TRACK_META } from "@/lib/interview/prompts"
import { getRewardConfig, isRewardEligible, rewardAmountForScore } from "@/lib/rewards"
import { buildFeedback } from "@/lib/interview/scoring"
import { addLeaderboardEntry, saveSession } from "@/lib/interview/storage"
import { recordTimelineEvent } from "@/lib/timeline/storage"
import { markQuestFlag } from "@/lib/quests/evaluate"
import type { InterviewSession } from "@/lib/interview/types"

const ORG_ADDRESS = process.env.NEXT_PUBLIC_IQLIFY_ORG_ADDRESS?.trim()

export function SessionResults({ sessionId }: { sessionId: string }) {
  const { address, isMiniappHost } = useWallet()
  const { session, ready, setSession } = useClientSession(sessionId)
  const { syncSession } = useSyncSessionToConvex()
  const addToConvexLeaderboard = useAddLeaderboardToConvex()
  const { profile, saveProfile } = useProfile(address)
  const { challenge: duelChallenge, clear: clearDuel } = useDuelChallenge()
  const { refresh: refreshQuests, markDone } = useQuests()
  const bumpStat = useBumpStat()
  const [paying, setPaying] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [inviting, setInviting] = React.useState(false)
  const [displayName, setDisplayName] = React.useState("Anonymous builder")
  const [timelineLogged, setTimelineLogged] = React.useState(false)
  const [regrading, setRegrading] = React.useState(false)
  const regradedRef = React.useRef(false)

  const rewardConfig = getRewardConfig()
  const eligibleReward = session?.score ? rewardAmountForScore(session.score.overall) : 0
  const canClaimReward =
    !!session?.score &&
    isRewardEligible(session.score.overall) &&
    !session.rewardClaimed &&
    !!address

  React.useEffect(() => {
    if (!address) return
    getSdk()
      .then((sdk) => sdk.rpc.profile.getProfileView(address as `0x${string}`))
      .then((view) => {
        const profileName = view.profile?.name
        if (profileName && !profile?.displayName) {
          setDisplayName(profileName)
          void saveProfile({ displayName: profileName }).catch(() => undefined)
        }
      })
      .catch(() => undefined)
  }, [address, profile?.displayName, saveProfile])

  React.useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName)
  }, [profile?.displayName])

  React.useEffect(() => {
    if (!address || !session?.score || timelineLogged) return
    recordTimelineEvent(address, {
      type: "interview_complete",
      title: "Interview completed",
      detail: `${TRACK_META[session.track].title} · score ${session.score.overall}`,
      value: session.score.overall,
    })
    bumpStat("interviews_completed")
    setTimelineLogged(true)
    refreshQuests()
  }, [address, session?.score, session?.track, timelineLogged, bumpStat, refreshQuests])

  React.useEffect(() => {
    if (!session || regradedRef.current || regrading) return
    const needsRegrade =
      session.voiceMode === "vapi" &&
      session.score?.overall === 0 &&
      session.recommendation === "retry" &&
      !session.localTranscript

    if (!needsRegrade) return
    regradedRef.current = true
    setRegrading(true)

    void fetch("/api/interview/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        vapiCallId: session.vapiCallId,
        voiceMode: session.voiceMode,
        track: session.track,
        role: session.role,
        skillLevel: session.skillLevel,
        duration: session.duration,
        createdAt: session.createdAt,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.score) return
        const next: InterviewSession = {
          ...session,
          score: data.score,
          feedback: data.feedback,
          strengths: data.strengths,
          areasForImprovement: data.areasForImprovement,
          recommendation: data.recommendation,
          localTranscript: data.transcript || session.localTranscript,
          vapiCallId: data.vapiCallId || session.vapiCallId,
        }
        setSession(next)
        saveSession(next)
        void syncSession(next)
      })
      .catch(() => undefined)
      .finally(() => setRegrading(false))
  }, [regrading, session, setSession, syncSession])

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

  async function finishDebriefUnlock(walletAddress: string) {
    if (!session?.score) return

    const next: InterviewSession = { ...session, debriefUnlocked: true }
    setSession(next)
    saveSession(next)
    void syncSession(next)

    addLeaderboardEntry({
      id: crypto.randomUUID(),
      address: walletAddress,
      displayName,
      avatarUrl: profile?.avatarUrl,
      track: session.track,
      score: session.score.overall,
      sessionId: session.id,
      createdAt: Date.now(),
    })

    void addToConvexLeaderboard({
      sessionId: session.id,
      address: walletAddress,
      displayName,
      avatarUrl: profile?.avatarUrl,
      track: session.track,
      score: session.score.overall,
    })

    if (address) {
      recordTimelineEvent(address, {
        type: "leaderboard_joined",
        title: "Leaderboard entry posted",
        detail: `Score ${session.score.overall} is now public.`,
        value: session.score.overall,
      })
      recordTimelineEvent(address, {
        type: "debrief_unlocked",
        title: "Full debrief unlocked",
        detail: isMiniappHost
          ? `Paid ${DEBRIEF_COST_CRC} CRC for AI feedback.`
          : "Unlocked in standalone dev mode.",
      })
    }

    toast.success(
      isMiniappHost
        ? "Full debrief unlocked — you are on the leaderboard"
        : "Full debrief unlocked — posted to local leaderboard",
    )
    refreshQuests()
  }

  async function unlockDebrief() {
    if (!session?.score) return

    if (isMiniappHost) {
      if (!ORG_ADDRESS) {
        toast.error("Set NEXT_PUBLIC_IQLIFY_ORG_ADDRESS in .env.local to enable CRC payments.")
        return
      }
      if (!address) {
        toast.error("Connect your Circles wallet to pay with CRC.")
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
        await finishDebriefUnlock(address)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Payment failed")
      } finally {
        setPaying(false)
      }
      return
    }

    setPaying(true)
    try {
      await finishDebriefUnlock(`standalone:${session.id.slice(0, 8)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unlock debrief")
    } finally {
      setPaying(false)
    }
  }

  async function claimReward() {
    if (!session?.score || !address) {
      toast.error("Connect your Circles wallet to claim CRC")
      return
    }

    setClaiming(true)
    try {
      const res = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, address }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Could not claim reward")
      }

      const next: InterviewSession = {
        ...session,
        rewardClaimed: true,
        rewardTxHash: data.txHash,
        rewardAmountCrc: data.amountCrc,
        walletAddress: address,
      }
      setSession(next)
      saveSession(next)
      void syncSession(next)

      recordTimelineEvent(address, {
        type: "reward_claimed",
        title: "CRC reward claimed",
        detail: `Received ${data.amountCrc} CRC in your wallet.`,
        value: data.amountCrc,
      })

      toast.success(`You earned ${data.amountCrc} CRC!`, {
        description: data.explorerUrl ? "Reward sent on Gnosis Chain" : undefined,
      })
      refreshQuests()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reward claim failed")
    } finally {
      setClaiming(false)
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
      invalidateReferralStatsCache(address as `0x${string}`)
      markQuestFlag(address, "referral_link")
      markDone("referral_link")
      bumpStat("referrals_copied")
      recordTimelineEvent(address, {
        type: "referral_sent",
        title: "Referral link copied",
        detail: "Invite a friend to practice on Circles.",
      })
      toast.success("Invite link copied — friend opens it in Circles to create a wallet")
      refreshQuests()
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
          <CardDescription className="flex items-center gap-2">
            {address ? (
              <ProfileAvatar
                name={displayName}
                address={address}
                avatarUrl={profile?.avatarUrl}
                size="sm"
              />
            ) : null}
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

          {address ? (
            <DuelResultCard
              challenge={duelChallenge}
              yourScore={session.score.overall}
              track={session.track}
              displayName={displayName}
              challengerAddress={address}
              sessionId={session.id}
              onChallengeSent={() => {
                clearDuel()
                refreshQuests()
              }}
            />
          ) : null}

          {session.rewardClaimed ? (
            <div className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <Badge className="bg-emerald-600 text-white">CRC reward claimed</Badge>
              <p className="text-sm">
                You received <strong>{session.rewardAmountCrc ?? eligibleReward} CRC</strong> in your
                Circles wallet.
              </p>
              {session.rewardTxHash ? (
                <a
                  href={`https://gnosisscan.io/tx/${session.rewardTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-emerald-700 underline dark:text-emerald-300"
                >
                  View on GnosisScan
                </a>
              ) : null}
            </div>
          ) : canClaimReward ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm">
                  Strong score — claim <strong>{eligibleReward} CRC</strong> sent from the IQlify
                  treasury to your wallet.
                </p>
                <Button className="w-full" onClick={claimReward} disabled={claiming}>
                  {claiming ? <LoaderCircle className="animate-spin" /> : null}
                  Claim {eligibleReward} CRC reward
                </Button>
              </CardContent>
            </Card>
          ) : session.score.overall < rewardConfig.minScore ? (
            <p className="rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Score {session.score.overall}/100 — need {rewardConfig.minScore}+ to earn CRC rewards.
            </p>
          ) : !address ? (
            <p className="rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Connect your Circles wallet to claim your CRC reward.
            </p>
          ) : null}

          {locked ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm text-muted-foreground">Preview: {previewTip}</p>
                <p className="text-sm">
                  Unlock the full AI debrief and post your score to the leaderboard
                  {isMiniappHost ? (
                    <>
                      {" "}
                      for <strong>{DEBRIEF_COST_CRC} CRC</strong>.
                    </>
                  ) : (
                    <> (free in standalone dev mode).</>
                  )}
                </p>
                {isMiniappHost && !ORG_ADDRESS ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Set NEXT_PUBLIC_IQLIFY_ORG_ADDRESS in .env.local to enable CRC payments.
                  </p>
                ) : null}
                {isMiniappHost && ORG_ADDRESS && !address ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Open IQlify inside Circles and connect your wallet to pay with CRC.
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  onClick={unlockDebrief}
                  disabled={paying || (isMiniappHost && (!ORG_ADDRESS || !address))}
                >
                  {paying ? <LoaderCircle className="animate-spin" /> : null}
                  {isMiniappHost
                    ? `Pay ${DEBRIEF_COST_CRC} CRC · unlock debrief`
                    : "Unlock debrief · post to leaderboard"}
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
