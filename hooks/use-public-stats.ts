"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"

import { isConvexConfigured } from "@/components/providers/convex-provider"
import { api } from "@/convex/_generated/api"

export function usePublicStats() {
  const remote = useQuery(api.stats.getPublic, isConvexConfigured() ? {} : "skip")
  const increment = useMutation(api.stats.increment)
  const [bumped, setBumped] = useState(false)

  useEffect(() => {
    if (bumped) return
    setBumped(true)
    if (isConvexConfigured()) {
      void increment({ key: "site_opens" }).catch(() => undefined)
    } else {
      void fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "site_opens" }),
      })
    }
  }, [bumped, increment])

  return (
    remote ?? {
      siteOpens: 0,
      profilesRead: 0,
      referralsCopied: 0,
      interviewsCompleted: 0,
    }
  )
}

export function bumpStat(key: "referrals_copied" | "interviews_completed" | "profiles_read") {
  if (isConvexConfigured()) return
  void fetch("/api/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  })
}
