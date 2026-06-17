import { NextRequest, NextResponse } from "next/server"
import { getAddress, isAddress } from "viem"

import { sendCrcRewardFromOrg, isOrgRewardPayoutConfigured } from "@/lib/circles-server"
import { convexGetSession, convexUpdateSession } from "@/lib/convex/server"
import { isRewardEligible, rewardAmountForScore } from "@/lib/rewards"

export async function POST(request: NextRequest) {
  try {
    if (!isOrgRewardPayoutConfigured()) {
      return NextResponse.json(
        { error: "Reward payouts are not configured on the server." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
    const address = typeof body.address === "string" ? body.address : ""

    if (!sessionId || !isAddress(address)) {
      return NextResponse.json({ error: "sessionId and valid address are required." }, { status: 400 })
    }

    const wallet = getAddress(address)
    const record = await convexGetSession(sessionId)

    if (!record) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 })
    }

    if (record.status !== "completed") {
      return NextResponse.json({ error: "Interview is not completed yet." }, { status: 400 })
    }

    if (record.rewardClaimed) {
      return NextResponse.json(
        {
          error: "Reward already claimed for this session.",
          txHash: record.rewardTxHash,
          amountCrc: record.rewardAmountCrc,
        },
        { status: 409 },
      )
    }

    const score = record.overallScore ?? 0
    if (!isRewardEligible(score)) {
      return NextResponse.json(
        { error: `Score ${score} is below the reward threshold.` },
        { status: 400 },
      )
    }

    if (record.walletAddress && getAddress(record.walletAddress) !== wallet) {
      return NextResponse.json(
        { error: "Connected wallet does not match the session wallet." },
        { status: 403 },
      )
    }

    const amountCrc = rewardAmountForScore(score)

    const { txHash, explorerUrl } = await sendCrcRewardFromOrg({
      to: wallet,
      amountCrc,
      sessionId,
    })

    await convexUpdateSession({
      sessionId,
      rewardClaimed: true,
      rewardTxHash: txHash,
      rewardAmountCrc: amountCrc,
      walletAddress: wallet,
    })

    return NextResponse.json({
      success: true,
      amountCrc,
      txHash,
      explorerUrl,
    })
  } catch (error) {
    console.error("[rewards/claim]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not claim reward." },
      { status: 500 },
    )
  }
}
