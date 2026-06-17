import { NextRequest, NextResponse } from "next/server"

import { ServerVapiService } from "@/lib/vapi/server-vapi-service"

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function GET(request: NextRequest) {
  try {
    const callId = new URL(request.url).searchParams.get("callId")
    if (!callId) {
      return NextResponse.json({ success: false, error: "Call ID is required" }, { status: 400 })
    }
    if (!isValidUUID(callId)) {
      return NextResponse.json({ success: false, error: "Invalid call ID format" }, { status: 400 })
    }

    const vapi = new ServerVapiService()
    const callData = await vapi.getCall(callId)
    return NextResponse.json({ success: true, callData })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
