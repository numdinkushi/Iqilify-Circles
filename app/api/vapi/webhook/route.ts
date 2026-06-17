import { NextRequest, NextResponse } from "next/server"

import { WEBHOOK_EVENTS } from "@/lib/vapi/config"
import { gradeFromCallData, gradeFromTranscript } from "@/lib/vapi/grade-call"
import { storeGrading } from "@/lib/vapi/grading-store"
import { ServerVapiService } from "@/lib/vapi/server-vapi-service"
import type { VapiWebhookPayload } from "@/lib/vapi/types"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "VAPI webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as VapiWebhookPayload & {
      message: VapiWebhookPayload["message"] & { transcript?: string }
    }

    switch (payload.message.type) {
      case WEBHOOK_EVENTS.END_OF_CALL: {
        if (!payload.message.call) {
          return NextResponse.json({ success: true, message: "No call data in payload" })
        }

        const callId = payload.message.call.id
        const assistantId = payload.message.call.assistantId

        let grading
        if (payload.message.transcript) {
          grading = await gradeFromTranscript(callId, payload.message.transcript)
        } else {
          const vapi = new ServerVapiService()
          const callData = await vapi.getCall(callId)
          grading = await gradeFromCallData(callId, callData)
        }

        storeGrading(callId, { ...grading, assistantId }, { callId })

        return NextResponse.json({
          success: true,
          message: "End of call report processed and grading stored",
        })
      }

      case WEBHOOK_EVENTS.CONVERSATION_UPDATE:
      case WEBHOOK_EVENTS.STATUS_UPDATE:
        return NextResponse.json({ success: true, message: "Event processed" })

      default:
        return NextResponse.json({ success: true, message: "Event ignored" })
    }
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
