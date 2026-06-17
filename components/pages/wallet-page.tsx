"use client"

import * as React from "react"
import { Copy, LoaderCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { CreateAccountButton } from "@/components/wallet/create-account-button"
import { useWallet } from "@/components/wallet/wallet-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSdk } from "@/lib/circles"
import { buildReferralShareUrl, createReferralLink, getReferralStats } from "@/lib/referrals"

export function WalletPage() {
  const { address, isConnected, isMiniappHost } = useWallet()
  const [balance, setBalance] = React.useState<string | null>(null)
  const [name, setName] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [inviting, setInviting] = React.useState(false)
  const [referralStats, setReferralStats] = React.useState<{
    claimed: number
    pending: number
    total: number
  } | null>(null)

  async function loadProfile() {
    if (!address) return
    setLoading(true)
    try {
      const sdk = await getSdk()
      const view = await sdk.rpc.profile.getProfileView(address as `0x${string}`)
      setBalance(view.v2Balance ?? "0")
      setName(view.profile?.name ?? null)
    } catch {
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadReferralStats() {
    if (!address) return
    try {
      const stats = await getReferralStats(address as `0x${string}`)
      setReferralStats(stats)
    } catch {
      setReferralStats(null)
    }
  }

  async function shareInvite() {
    if (!address || !isMiniappHost) {
      toast.error("Open inside the Circles app to create referral links")
      return
    }
    setInviting(true)
    try {
      const secret = await createReferralLink(address as `0x${string}`)
      await navigator.clipboard.writeText(buildReferralShareUrl(secret))
      toast.success("Referral link copied")
      await loadReferralStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invite")
    } finally {
      setInviting(false)
    }
  }

  React.useEffect(() => {
    loadProfile()
    loadReferralStats()
  }, [address])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>CRC wallet</CardTitle>
          <CardDescription>
            Native Circles currency — not Celo. Your balance lives on Gnosis Chain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              <p className="text-sm text-muted-foreground">
                {isMiniappHost
                  ? "Connect your Circles account to see your CRC balance."
                  : "Open inside the Circles host to view your wallet."}
              </p>
              <CreateAccountButton />
            </>
          ) : (
            <>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-3xl font-semibold">
                  {loading ? "…" : balance ?? "—"} <span className="text-base">CRC</span>
                </p>
                {name ? <p className="text-sm text-muted-foreground">{name}</p> : null}
                <p className="mt-2 font-mono text-xs text-muted-foreground">{address}</p>
              </div>
              <button
                type="button"
                onClick={loadProfile}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Refresh balance
              </button>
            </>
          )}
        </CardContent>
      </Card>

      {isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>Referrals</CardTitle>
            <CardDescription>
              Invite friends to create a Circles wallet inside IQlify. Claimed invites count toward
              garage judging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {referralStats ? (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-2xl font-semibold">{referralStats.claimed}</p>
                  <p className="text-xs text-muted-foreground">Claimed</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-2xl font-semibold">{referralStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="text-2xl font-semibold">{referralStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            ) : null}
            <Button
              className="w-full"
              variant="outline"
              onClick={shareInvite}
              disabled={inviting || !isMiniappHost}
            >
              {inviting ? <LoaderCircle className="animate-spin" /> : <Copy />}
              {inviting ? "Creating invite…" : "Copy referral link"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Unlock full interview debriefs for 2 CRC. Payments use annotated transfers so sessions
          stay verifiable on-chain.
        </CardContent>
      </Card>
    </div>
  )
}
