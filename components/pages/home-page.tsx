"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Mic, Sparkles, Trophy, Wallet } from "lucide-react"

import { CreateAccountButton } from "@/components/wallet/create-account-button"
import { useWallet } from "@/components/wallet/wallet-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TRACK_META } from "@/lib/interview/prompts"
import { shortenAddress } from "@/lib/referrals"

export function HomePage() {
  const { isConnected, isMiniappHost, referralInviter, referralSecret } = useWallet()

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Badge className="rounded-full">circles/garage · cycle 05</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Master interviews.
          <br />
          <span className="text-emerald-600">Earn with CRC.</span>
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          IQlify is AI interview prep built for the Circles ecosystem. Practice technical,
          behavioral, and builder interviews — then unlock your full debrief with CRC.
        </p>
      </section>

      {referralSecret && !isConnected ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">You&apos;re invited</CardTitle>
            <CardDescription>
              {referralInviter
                ? `${shortenAddress(referralInviter)} invited you to practice interviews on Circles.`
                : "Create your Circles account to claim this referral invite."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAccountButton />
          </CardContent>
        </Card>
      ) : !isConnected && isMiniappHost ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect to start</CardTitle>
            <CardDescription>
              Your Circles wallet binds sessions, scores, and leaderboard entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAccountButton />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {(Object.keys(TRACK_META) as Array<keyof typeof TRACK_META>).map((key) => {
          const meta = TRACK_META[key]
          return (
            <Card key={key} className={`bg-gradient-to-r ${meta.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span>{meta.icon}</span>
                  {meta.title}
                </CardTitle>
                <CardDescription>{meta.subtitle}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-4">
            <Mic className="size-4" />
            Practice
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-4">
            <Sparkles className="size-4" />
            AI feedback
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-4">
            <Wallet className="size-4" />
            Pay in CRC
          </CardContent>
        </Card>
      </div>

      <Button asChild className="w-full">
        <Link href="/interview">
          Start interviewing
          <ArrowRight />
        </Link>
      </Button>

      <Button asChild variant="outline" className="w-full">
        <Link href="/leaderboard">
          <Trophy />
          View leaderboard
        </Link>
      </Button>
    </div>
  )
}
