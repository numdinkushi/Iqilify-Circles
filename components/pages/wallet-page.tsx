"use client"

import * as React from "react"
import { LoaderCircle, RefreshCw } from "lucide-react"

import { CreateAccountButton } from "@/components/wallet/create-account-button"
import { useWallet } from "@/components/wallet/wallet-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSdk } from "@/lib/circles"

export function WalletPage() {
  const { address, isConnected, isMiniappHost } = useWallet()
  const [balance, setBalance] = React.useState<string | null>(null)
  const [name, setName] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

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

  React.useEffect(() => {
    loadProfile()
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

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Unlock full interview debriefs for 2 CRC. Payments use annotated transfers so sessions
          stay verifiable on-chain.
        </CardContent>
      </Card>
    </div>
  )
}
