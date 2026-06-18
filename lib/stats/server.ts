import { getConvexServerClient } from "@/lib/convex/server"
import { api } from "@/convex/_generated/api"

export function isConvexConfigured() {
  return !!process.env.NEXT_PUBLIC_CONVEX_URL?.trim()
}

export async function incrementAppStat(key: string, amount = 1) {
  const convex = getConvexServerClient()
  if (!convex) return null
  return convex.mutation(api.stats.increment, { key, amount })
}

export async function fetchPublicStats() {
  const convex = getConvexServerClient()
  if (!convex) return null
  return convex.query(api.stats.getPublic, {})
}
