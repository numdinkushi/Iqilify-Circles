import { NextRequest, NextResponse } from "next/server"
import { getAddress, isAddress } from "viem"

import { ensureOrgTrustsUser, isOrgRewardPayoutConfigured } from "@/lib/circles-server"

export async function POST(request: NextRequest) {
  try {
    if (!isOrgRewardPayoutConfigured()) {
      return NextResponse.json({ error: "Treasury is not configured on the server." }, { status: 503 })
    }

    const body = await request.json()
    const address = typeof body.address === "string" ? body.address : ""

    if (!isAddress(address)) {
      return NextResponse.json({ error: "Valid address is required." }, { status: 400 })
    }

    await ensureOrgTrustsUser(getAddress(address))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[treasury/trust-recipient]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not trust recipient." },
      { status: 500 },
    )
  }
}
