"use client"

import { useEffect, useRef, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useWallet } from "@/components/wallet/wallet-provider"

type MiniappSdk = typeof import("@aboutcircles/miniapp-sdk")

export function CreateAccountButton({
  label = "Connect Circles account",
  referralLabel = "Create account & claim invite",
}: {
  label?: string
  referralLabel?: string
}) {
  const { isConnected, isMiniappHost, referralSecret } = useWallet()
  const sdkRef = useRef<MiniappSdk | null>(null)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    import("@aboutcircles/miniapp-sdk").then((sdk) => {
      if (!active) return
      sdkRef.current = sdk
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleClick() {
    const sdk = sdkRef.current
    if (!sdk) return
    setPending(true)
    try {
      await sdk.requestCreateAccount()
      if (referralSecret) {
        toast.success("Circles account connected — welcome to IQlify")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account setup cancelled")
    } finally {
      setPending(false)
    }
  }

  if (!isMiniappHost) {
    return (
      <p className="text-sm text-muted-foreground">
        Open inside the Circles mini-app host to connect your wallet.
      </p>
    )
  }

  const buttonLabel = referralSecret && !isConnected ? referralLabel : isConnected ? "Switch account" : label

  return (
    <Button onClick={handleClick} disabled={!ready || pending}>
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" />
          Waiting for host…
        </>
      ) : (
        buttonLabel
      )}
    </Button>
  )
}
