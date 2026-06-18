"use client"

import { useCallback } from "react"
import { useMutation } from "convex/react"

import { isConvexConfigured } from "@/components/providers/convex-provider"
import { api } from "@/convex/_generated/api"

export type StatKey = "site_opens" | "profiles_read" | "referrals_copied" | "interviews_completed"

export function useBumpStat() {
  const increment = useMutation(api.stats.increment)

  return useCallback(
    (key: StatKey) => {
      if (isConvexConfigured()) {
        void increment({ key }).catch(() => undefined)
        return
      }
      void fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
    },
    [increment]
  )
}
