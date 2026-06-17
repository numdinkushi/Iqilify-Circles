"use client"

import * as React from "react"
import { Copy, LoaderCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { CreateAccountButton } from "@/components/wallet/create-account-button"
import { useWallet } from "@/components/wallet/wallet-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSdk, buildTreasuryFundPreview, fundOrgTreasury } from "@/lib/circles"
import { shortenAddress, buildReferralShareUrl, createReferralLink, getReferralStats, inviteExistingSafe } from "@/lib/referrals"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const TREASURY_SAFE_TO_INVITE = process.env.NEXT_PUBLIC_IQLIFY_TREASURY_SAFE_TO_INVITE?.trim()
const ORG_ADDRESS = process.env.NEXT_PUBLIC_IQLIFY_ORG_ADDRESS?.trim()

function parseCrcBalance(value: string | null): number {
  if (!value) return 0
  const normalized = value.replace(/,/g, "").trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function WalletPage() {
  const { address, isConnected, isMiniappHost } = useWallet()
  const [balance, setBalance] = React.useState<string | null>(null)
  const [name, setName] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [inviting, setInviting] = React.useState(false)
  const [invitingTreasury, setInvitingTreasury] = React.useState(false)
  const [fundingTreasury, setFundingTreasury] = React.useState(false)
  const [fundAmount, setFundAmount] = React.useState("30")
  const [fundConfirmOpen, setFundConfirmOpen] = React.useState(false)
  const [skipSenderTrust, setSkipSenderTrust] = React.useState(false)
  const [referralStats, setReferralStats] = React.useState<{
    claimed: number
    pending: number
    total: number
  } | null>(null)
  const [orgBalance, setOrgBalance] = React.useState<string | null>(null)
  const [orgBalanceLoading, setOrgBalanceLoading] = React.useState(false)

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

  async function loadOrgTreasuryBalance() {
    if (!ORG_ADDRESS) return
    setOrgBalanceLoading(true)
    try {
      const res = await fetch("/api/treasury/balance")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load treasury balance")
      setOrgBalance(data.balance ?? "0")
    } catch {
      setOrgBalance(null)
    } finally {
      setOrgBalanceLoading(false)
    }
  }

  const availableCrc = parseCrcBalance(balance)
  const fundAmountNum = Number(fundAmount)
  const fundAmountValid =
    Number.isFinite(fundAmountNum) && fundAmountNum > 0 && fundAmountNum <= availableCrc

  const fundPreview =
    address && ORG_ADDRESS && fundAmountValid
      ? buildTreasuryFundPreview({
          from: address,
          to: ORG_ADDRESS,
          amountCrc: fundAmountNum,
        })
      : null

  function openFundConfirm() {
    if (!fundAmountValid) {
      toast.error(
        availableCrc > 0
          ? `Enter an amount between 0 and ${availableCrc} CRC`
          : "Refresh your balance first",
      )
      return
    }
    setFundConfirmOpen(true)
  }

  async function fundTreasury() {
    if (!address || !isMiniappHost || !ORG_ADDRESS) {
      toast.error("Open IQlify in the Circles playground with KUSHI connected")
      return
    }
    if (!fundAmountValid) {
      toast.error(
        availableCrc > 0
          ? `Enter an amount between 0 and ${availableCrc} CRC`
          : "Refresh your balance first",
      )
      return
    }
    setFundingTreasury(true)
    try {
      await fundOrgTreasury({
        from: address,
        to: ORG_ADDRESS,
        amountCrc: fundAmountNum,
        skipSenderTrust,
      })
      toast.success(`Sent ${fundAmountNum} CRC to IQlify treasury`)
      setFundConfirmOpen(false)
      await Promise.all([loadProfile(), loadOrgTreasuryBalance()])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not fund treasury")
    } finally {
      setFundingTreasury(false)
    }
  }

  async function inviteTreasurySafe() {
    if (!address || !isMiniappHost || !TREASURY_SAFE_TO_INVITE) {
      toast.error("Open IQlify in the Circles playground with KUSHI connected")
      return
    }
    setInvitingTreasury(true)
    try {
      await inviteExistingSafe(
        address as `0x${string}`,
        TREASURY_SAFE_TO_INVITE as `0x${string}`,
      )
      toast.success("Treasury Safe invited — register it as Human on aboutcircles.com")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not invite treasury Safe")
    } finally {
      setInvitingTreasury(false)
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
    loadOrgTreasuryBalance()
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

      {isConnected && ORG_ADDRESS ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle>Treasury setup</CardTitle>
            <CardDescription>
              Fund IQlify org ({shortenAddress(ORG_ADDRESS)}) from KUSHI using Circles pathfinding —
              bypasses the Gnosis app send-limit UI. Signs trust + transfer in the playground.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">IQlify org treasury (on-chain)</p>
              <p className="text-2xl font-semibold">
                {orgBalanceLoading ? "…" : orgBalance ?? "—"}{" "}
                <span className="text-sm">CRC</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Source of truth via Circles RPC — may differ from the aboutcircles.com org dashboard.
              </p>
              <button
                type="button"
                onClick={loadOrgTreasuryBalance}
                className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
              >
                {orgBalanceLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Refresh treasury balance
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-amount">Amount (CRC)</Label>
              <Input
                id="fund-amount"
                type="number"
                min={0}
                max={availableCrc > 0 ? availableCrc : undefined}
                step="1"
                inputMode="decimal"
                placeholder="e.g. 30"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                disabled={fundingTreasury}
              />
              <p className="text-xs text-muted-foreground">
                {loading
                  ? "Loading balance…"
                  : availableCrc > 0
                    ? `Available: ${availableCrc} CRC`
                    : "Refresh balance to see your limit"}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={openFundConfirm}
              disabled={fundingTreasury || !isMiniappHost || !fundAmountValid}
            >
              {fundingTreasury ? <LoaderCircle className="animate-spin" /> : null}
              {fundingTreasury ? "Funding treasury…" : "Fund treasury"}
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={skipSenderTrust}
                onChange={(e) => setSkipSenderTrust(e.target.checked)}
              />
              I already trusted IQlify org (skip trust step)
            </label>
            {TREASURY_SAFE_TO_INVITE ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={inviteTreasurySafe}
                disabled={invitingTreasury || !isMiniappHost}
              >
                {invitingTreasury ? <LoaderCircle className="animate-spin" /> : null}
                {invitingTreasury ? "Inviting treasury…" : "Invite backup Human Safe (advanced)"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={fundConfirmOpen} onOpenChange={setFundConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm treasury funding</DialogTitle>
            <DialogDescription>
              Review the amount before approving in the Circles wallet.
            </DialogDescription>
          </DialogHeader>
          {fundPreview ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-3xl font-semibold">
                  {fundPreview.amountCrc} <span className="text-base">CRC</span>
                </p>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  <span className="text-foreground">From:</span> {shortenAddress(fundPreview.from)}
                </p>
                <p>
                  <span className="text-foreground">To:</span> {shortenAddress(fundPreview.to)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Transactions</p>
                {fundPreview.steps
                  .filter((step) => !(skipSenderTrust && step.label === "Trust IQlify org"))
                  .map((step) => (
                    <div key={step.label} className="rounded-lg border px-3 py-2">
                      <p className="font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={fundTreasury} disabled={fundingTreasury}>
              {fundingTreasury ? <LoaderCircle className="animate-spin" /> : null}
              Approve {fundAmountNum} CRC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
