import { NextRequest, NextResponse } from "next/server"

import { incrementAppStat, isConvexConfigured } from "@/lib/stats/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const key = typeof body.key === "string" ? body.key : "site_opens"
    const allowed = ["site_opens", "profiles_read", "referrals_copied", "interviews_completed"]
    if (!allowed.includes(key)) {
      return NextResponse.json({ error: "Invalid stat key." }, { status: 400 })
    }

    if (!isConvexConfigured()) {
      return NextResponse.json({ ok: true, localOnly: true })
    }

    await incrementAppStat(key)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update stats." },
      { status: 500 }
    )
  }
}
