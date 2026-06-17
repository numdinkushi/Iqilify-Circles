"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useWallet } from "@/components/wallet/wallet-provider"
import { getReferralStats } from "@/lib/referrals"
import {
  evaluateQuests,
  hasLocalQuestFlag,
  markQuestFlag,
  questSummary,
  readinessTier,
  type QuestId,
  type QuestItem,
} from "@/lib/quests/evaluate"
import { useProfile } from "@/hooks/use-profile"

export function useQuests() {
  const { address } = useWallet()
  const { profile } = useProfile(address)
  const [referralStats, setReferralStats] = useState<{
    claimed: number
    pending: number
    total: number
  } | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (!address) {
      setReferralStats(null)
      return
    }

    // Local flag already satisfies the referral quest — skip remote list call.
    if (hasLocalQuestFlag(address, "referral_link")) {
      setReferralStats({ claimed: 0, pending: 0, total: 1 })
      return
    }

    let cancelled = false
    getReferralStats(address as `0x${string}`)
      .then((stats) => {
        if (!cancelled) setReferralStats(stats)
      })
      .catch(() => {
        if (!cancelled) setReferralStats({ claimed: 0, pending: 0, total: 0 })
      })

    return () => {
      cancelled = true
    }
  }, [address, tick])

  const items = useMemo(
    () =>
      evaluateQuests({
        address,
        avatarUrl: profile?.avatarUrl,
        referralStats,
      }),
    [address, profile?.avatarUrl, referralStats]
  )

  const summary = useMemo(() => questSummary(items), [items])
  const tier = useMemo(
    () => readinessTier(summary.earnedXp, summary.totalXp),
    [summary.earnedXp, summary.totalXp]
  )

  const markDone = useCallback(
    (questId: QuestId) => {
      if (!address) return
      markQuestFlag(address, questId)
      refresh()
    },
    [address, refresh]
  )

  return { items, summary, tier, refresh, markDone } satisfies {
    items: QuestItem[]
    summary: ReturnType<typeof questSummary>
    tier: ReturnType<typeof readinessTier>
    refresh: () => void
    markDone: (questId: QuestId) => void
  }
}
