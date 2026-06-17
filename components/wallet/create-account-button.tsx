"use client"

import { useEffect, useRef, useState } from "react"
import { LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useWallet } from "@/components/wallet/wallet-provider"

type MiniappSdk = typeof import("@aboutcircles/miniapp-sdk")

export function CreateAccountButton({ label = "Connect Circles account" }: { label?: string }) {
  const { isConnected, isMiniappHost } = useWallet()
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

  return (
    <Button onClick={handleClick} disabled={!ready || pending}>
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" />
          Waiting for host…
        </>
      ) : isConnected ? (
        "Switch account"
      ) : (
        label
      )}
    </Button>
  )
}
