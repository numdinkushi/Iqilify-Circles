"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"

import { isConvexConfigured } from "@/components/providers/convex-provider"
import { api } from "@/convex/_generated/api"
import {
  cacheProfileLocally,
  loadCachedProfile,
  type UserProfile,
} from "@/lib/profile/storage"
import { recordTimelineEvent } from "@/lib/timeline/storage"

export function useProfile(address?: string | null) {
  const normalized = address?.toLowerCase() ?? null
  const remote = useQuery(
    api.profiles.getByAddress,
    isConvexConfigured() && normalized ? { address: normalized } : "skip"
  )
  const upsert = useMutation(api.profiles.upsert)
  const [local, setLocal] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!normalized) {
      setLocal(null)
      return
    }
    setLocal(loadCachedProfile(normalized))
  }, [normalized])

  useEffect(() => {
    if (!normalized || !remote) return
    const merged: UserProfile = {
      address: normalized,
      displayName: remote.displayName,
      avatarUrl: remote.avatarUrl,
      updatedAt: remote.updatedAt,
    }
    cacheProfileLocally(merged)
    setLocal(merged)
  }, [remote, normalized])

  const profile = useMemo<UserProfile | null>(() => {
    if (!normalized) return null
    return {
      address: normalized,
      displayName: remote?.displayName ?? local?.displayName,
      avatarUrl: remote?.avatarUrl ?? local?.avatarUrl,
      updatedAt: remote?.updatedAt ?? local?.updatedAt,
    }
  }, [local, normalized, remote])

  const saveProfile = useCallback(
    async (updates: { displayName?: string; avatarUrl?: string }) => {
      if (!normalized) throw new Error("Connect your wallet first.")

      if (isConvexConfigured()) {
        await upsert({ address: normalized, ...updates })
      }

      const next: UserProfile = {
        address: normalized,
        displayName: updates.displayName ?? profile?.displayName,
        avatarUrl: updates.avatarUrl ?? profile?.avatarUrl,
        updatedAt: Date.now(),
      }
      cacheProfileLocally(next)
      setLocal(next)

      if (updates.avatarUrl) {
        recordTimelineEvent(normalized, {
          type: "avatar_updated",
          title: "Profile avatar updated",
          detail: "Your custom avatar is live on IQlify.",
        })
        void fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "profiles_read" }),
        })
      }

      return next
    },
    [normalized, profile?.avatarUrl, profile?.displayName, upsert]
  )

  return { profile, saveProfile, loading: normalized !== null && remote === undefined }
}

export function useProfilesByAddresses(addresses: string[]) {
  const normalized = useMemo(
    () => [...new Set(addresses.map((a) => a.toLowerCase()))].filter(Boolean),
    [addresses]
  )
  return useQuery(
    api.profiles.getByAddresses,
    isConvexConfigured() && normalized.length > 0 ? { addresses: normalized } : "skip"
  )
}
