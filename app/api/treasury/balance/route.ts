import { NextResponse } from "next/server"

import { getOrgTreasuryBalance, getOrgTreasuryAddress } from "@/lib/circles-server"

export async function GET() {
  try {
    if (!getOrgTreasuryAddress()) {
      return NextResponse.json({ error: "Treasury address is not configured." }, { status: 503 })
    }

    const treasury = await getOrgTreasuryBalance()
    return NextResponse.json(treasury)
  } catch (error) {
    console.error("[treasury/balance]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load treasury balance." },
      { status: 500 },
    )
  }
}
