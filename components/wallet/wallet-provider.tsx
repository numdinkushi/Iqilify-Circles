"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import {
  clearReferralSecret,
  getStoredReferralSecret,
  isValidReferralSecret,
  lookupReferralInviter,
  persistReferralSecret,
  readReferralSecretFromUrl,
} from "@/lib/referrals"

type WalletContextValue = {
  address: string | null
  isConnected: boolean
  isMiniappHost: boolean
  referralSecret: string | null
  referralInviter: string | null
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnected: false,
  isMiniappHost: false,
  referralSecret: null,
  referralInviter: null,
})

function parseHostReferralData(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const candidate = parsed.referralSecret ?? parsed.secret ?? parsed.referral
    return typeof candidate === "string" && isValidReferralSecret(candidate) ? candidate : null
  } catch {
    return isValidReferralSecret(raw) ? raw : null
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isMiniappHost, setIsMiniappHost] = useState(false)
  const [referralSecret, setReferralSecret] = useState<string | null>(null)
  const [referralInviter, setReferralInviter] = useState<string | null>(null)

  useEffect(() => {
    const secret = readReferralSecretFromUrl() ?? getStoredReferralSecret()
    if (secret) setReferralSecret(secret)
  }, [])

  useEffect(() => {
    if (!referralSecret) {
      setReferralInviter(null)
      return
    }
    let cancelled = false
    lookupReferralInviter(referralSecret).then((inviter) => {
      if (!cancelled) setReferralInviter(inviter)
    })
    return () => {
      cancelled = true
    }
  }, [referralSecret])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    import("@aboutcircles/miniapp-sdk")
      .then(({ onWalletChange, isMiniappMode, onAppData }) => {
        if (cancelled) return
        setIsMiniappHost(isMiniappMode())

        onAppData((raw) => {
          const secret = parseHostReferralData(raw)
          if (!secret) return
          persistReferralSecret(secret)
          setReferralSecret(secret)
        })

        unsubscribe = onWalletChange((next) => {
          setAddress(next ?? null)
          if (next) clearReferralSecret()
        })
      })
      .catch((error) => {
        console.error("[miniapp-sdk]", error)
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isMiniappHost,
        referralSecret,
        referralInviter,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
