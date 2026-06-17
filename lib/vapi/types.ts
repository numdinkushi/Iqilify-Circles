export interface VapiWebhookPayload {
  message: {
    type: "function-call" | "conversation-update" | "end-of-call-report" | "status-update"
    functionCall?: {
      name: string
      parameters: Record<string, unknown>
    }
    call?: {
      id: string
      assistantId: string
      status: string
    }
    transcript?: string
  }
}

export interface GradingRecord {
  id: string
  callId: string | null
  sessionId: string | null
  gradingResults: Record<string, unknown>
  timestamp: string
  createdAt: string
}
