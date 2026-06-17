"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type WalletContextValue = {
  address: string | null
  isConnected: boolean
  isMiniappHost: boolean
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  isConnected: false,
  isMiniappHost: false,
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isMiniappHost, setIsMiniappHost] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    import("@aboutcircles/miniapp-sdk")
      .then(({ onWalletChange, isMiniappMode }) => {
        if (cancelled) return
        setIsMiniappHost(isMiniappMode())
        unsubscribe = onWalletChange((next) => setAddress(next ?? null))
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
    <WalletContext.Provider value={{ address, isConnected: !!address, isMiniappHost }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
