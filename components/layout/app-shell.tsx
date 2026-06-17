"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Mic, Settings, Trophy, Wallet } from "lucide-react"

import { useWallet } from "@/components/wallet/wallet-provider"
import { cn, shortenAddress } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/interview", label: "Interview", icon: Mic },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { address, isConnected, isMiniappHost } = useWallet()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tracking-tight">IQlify</p>
            <p className="text-xs text-muted-foreground">Practice interviews · pay in CRC</p>
          </div>
          <div className="text-right text-xs">
            {isConnected ? (
              <span className="rounded-full border px-2 py-1 font-mono">
                {shortenAddress(address!)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {isMiniappHost ? "Not connected" : "Standalone"}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">{children}</main>

      <nav className="sticky bottom-0 border-t bg-background/95 px-2 py-2 backdrop-blur">
        <div className="grid grid-cols-5 gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
