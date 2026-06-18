import type { Address } from "@aboutcircles/sdk-types"

import { getSdk, submitViaHost, type EncodedTx } from "@/lib/circles"

export const REFERRAL_SECRET_KEY = "iqlify:referral-secret"

const SECRET_PATTERN = /^0x[a-fA-F0-9]{64}$/

export function isValidReferralSecret(value: string | null | undefined): value is string {
  return !!value && SECRET_PATTERN.test(value)
}

export function persistReferralSecret(secret: string) {
  if (!isValidReferralSecret(secret)) return
  sessionStorage.setItem(REFERRAL_SECRET_KEY, secret)
}

export function getStoredReferralSecret(): string | null {
  if (typeof window === "undefined") return null
  const stored = sessionStorage.getItem(REFERRAL_SECRET_KEY)
  return isValidReferralSecret(stored) ? stored : null
}

export function readReferralSecretFromUrl(): string | null {
  if (typeof window === "undefined") return null
  const secret = new URLSearchParams(window.location.search).get("secret")
  if (isValidReferralSecret(secret)) {
    persistReferralSecret(secret)
    return secret
  }
  return getStoredReferralSecret()
}

export function clearReferralSecret() {
  sessionStorage.removeItem(REFERRAL_SECRET_KEY)
}

export function buildReferralShareUrl(secret: string): string {
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
  const appUrl = `${appOrigin.replace(/\/$/, "")}/interview?secret=${encodeURIComponent(secret)}`
  const hostBase =
    process.env.NEXT_PUBLIC_CIRCLES_HOST_URL ?? "https://circles.gnosis.io/playground"
  return `${hostBase.replace(/\/$/, "")}?url=${encodeURIComponent(appUrl)}`
}

function toEncodedTx(tx: { to?: string; data?: string; value?: bigint | string | number }): EncodedTx {
  if (!tx.to) throw new Error("Invalid invitation transaction.")
  const value =
    tx.value === undefined ? "0" : typeof tx.value === "number" ? String(tx.value) : tx.value
  return {
    to: tx.to,
    data: tx.data,
    value,
  }
}

async function getInvitationsClient() {
  const { Invitations } = await import("@aboutcircles/sdk-invitations")
  const { circlesConfig } = await import("@aboutcircles/sdk-utils")
  return new Invitations(circlesConfig[100])
}

export async function getInviteQuota(inviter: Address): Promise<bigint> {
  const { InviteFarm } = await import("@aboutcircles/sdk-invitations")
  const { circlesConfig } = await import("@aboutcircles/sdk-utils")
  const farm = new InviteFarm(circlesConfig[100])
  return farm.getQuota(inviter)
}

export async function lookupReferralInviter(secret: string): Promise<string | null> {
  if (!isValidReferralSecret(secret)) return null
  try {
    const sdk = await getSdk()
    const info = await sdk.referrals.retrieve(secret)
    return info.inviter ?? null
  } catch {
    return null
  }
}

/** Invite an existing Safe (not yet a Circles human) so they can register with this inviter. */
export async function inviteExistingSafe(inviter: Address, invitee: Address): Promise<void> {
  const invitations = await getInvitationsClient()
  const setupTxs = await invitations.ensureInviterSetup(inviter)
  if (setupTxs.length > 0) {
    await submitViaHost(setupTxs.map(toEncodedTx))
  }

  const txs = await invitations.generateInvite(inviter, invitee)
  if (txs.length === 0) {
    throw new Error("No invitation transactions were generated.")
  }
  await submitViaHost(txs.map(toEncodedTx))
}

export async function createReferralLink(inviter: Address): Promise<string> {
  const quota = await getInviteQuota(inviter)
  if (quota < BigInt(1)) {
    throw new Error("No invite quota left. Each referral costs 96 CRC of invitation quota.")
  }

  const invitations = await getInvitationsClient()
  const setupTxs = await invitations.ensureInviterSetup(inviter)
  if (setupTxs.length > 0) {
    await submitViaHost(setupTxs.map(toEncodedTx))
  }

  const { transactions, privateKey } = await invitations.generateReferral(inviter)
  await submitViaHost(transactions.map(toEncodedTx))

  const sdk = await getSdk()
  await sdk.referrals.store(privateKey, inviter)

  return privateKey
}

export type ReferralStats = {
  claimed: number
  pending: number
  total: number
}

const EMPTY_REFERRAL_STATS: ReferralStats = { claimed: 0, pending: 0, total: 0 }
const REFERRAL_STATS_TTL_MS = 5 * 60 * 1000

type CachedReferralStats = {
  data: ReferralStats
  fetchedAt: number
}

const referralStatsCache = new Map<string, CachedReferralStats>()
const referralStatsInflight = new Map<string, Promise<ReferralStats>>()

export function invalidateReferralStatsCache(inviter?: Address) {
  if (inviter) {
    referralStatsCache.delete(inviter.toLowerCase())
    referralStatsInflight.delete(inviter.toLowerCase())
    return
  }
  referralStatsCache.clear()
  referralStatsInflight.clear()
}

async function fetchReferralStatsFromService(inviter: Address): Promise<ReferralStats> {
  const invitations = await getInvitationsClient()
  const { referrals, total } = await invitations.listReferrals(inviter, 50, 0)
  const claimed = referrals.filter((r) => r.status === "claimed").length
  const pending = referrals.filter(
    (r) => r.status === "pending" || r.status === "confirmed" || r.status === "stale",
  ).length
  return { claimed, pending, total }
}

/** Referral list from the Circles service — 404 is normal when none exist yet. */
export async function getReferralStats(inviter: Address): Promise<ReferralStats> {
  const key = inviter.toLowerCase()
  const cached = referralStatsCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < REFERRAL_STATS_TTL_MS) {
    return cached.data
  }

  const inflight = referralStatsInflight.get(key)
  if (inflight) return inflight

  const request = fetchReferralStatsFromService(inviter)
    .then((data) => {
      referralStatsCache.set(key, { data, fetchedAt: Date.now() })
      return data
    })
    .catch((error: unknown) => {
      // No referrals indexed yet → service returns 404. Treat as empty, don't spam retries.
      const message = error instanceof Error ? error.message : String(error)
      const isNotFound = /404|not found/i.test(message)
      if (!isNotFound) {
        console.warn("[referrals] Could not load referral stats:", message)
      }
      referralStatsCache.set(key, { data: EMPTY_REFERRAL_STATS, fetchedAt: Date.now() })
      return EMPTY_REFERRAL_STATS
    })
    .finally(() => {
      referralStatsInflight.delete(key)
    })

  referralStatsInflight.set(key, request)
  return request
}

export function shortenAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}
