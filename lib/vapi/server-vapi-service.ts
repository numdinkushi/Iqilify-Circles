import { VAPI_CONFIG } from "@/lib/vapi/config"

export class ServerVapiService {
  private baseUrl: string
  private apiKey: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || VAPI_CONFIG.apiKey
    this.baseUrl = baseUrl || VAPI_CONFIG.baseUrl
    if (!this.apiKey) {
      throw new Error("VAPI API key is required")
    }
  }

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    }
  }

  private async handleApiError(response: Response): Promise<never> {
    const errorText = await response.text()
    let errorMessage = `VAPI API Error: ${response.status} ${response.statusText}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }
    throw new Error(errorMessage)
  }

  async getCall(callId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/call/${callId}`, {
      method: "GET",
      headers: this.getHeaders(),
    })
    if (!response.ok) await this.handleApiError(response)
    return response.json()
  }

  /** Vapi may need a moment after hangup before transcript/messages are ready. */
  async getCallWithTranscript(
    callId: string,
    opts?: { attempts?: number; delayMs?: number },
  ): Promise<Record<string, unknown>> {
    const attempts = opts?.attempts ?? 6
    const delayMs = opts?.delayMs ?? 2000
    let lastCall: Record<string, unknown> | null = null

    for (let attempt = 0; attempt < attempts; attempt++) {
      const call = await this.getCall(callId)
      lastCall = call

      const transcript = typeof call.transcript === "string" ? call.transcript.trim() : ""
      const messages = call.messages
      const artifact = call.artifact as Record<string, unknown> | undefined
      const artifactTranscript =
        typeof artifact?.transcript === "string" ? artifact.transcript.trim() : ""

      if (transcript || artifactTranscript || (Array.isArray(messages) && messages.length > 2)) {
        return call
      }

      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return lastCall || {}
  }

  async listRecentCalls(limit = 25): Promise<Record<string, unknown>[]> {
    const response = await fetch(`${this.baseUrl}/call?limit=${limit}`, {
      method: "GET",
      headers: this.getHeaders(),
    })
    if (!response.ok) await this.handleApiError(response)
    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  async findCallIdBySessionId(
    sessionId: string,
    opts?: { track?: string; createdAfter?: number },
  ): Promise<string | null> {
    const calls = await this.listRecentCalls(30)

    for (const call of calls) {
      const id = typeof call.id === "string" ? call.id : null
      if (!id) continue

      const overrides = call.assistantOverrides as Record<string, unknown> | undefined
      const metadata = overrides?.metadata as Record<string, unknown> | undefined
      if (metadata?.sessionId === sessionId) return id
    }

    // Fallback for calls started before sessionId was stored in metadata.
    for (const call of calls) {
      const id = typeof call.id === "string" ? call.id : null
      if (!id || call.status !== "ended") continue

      const startedAt = typeof call.startedAt === "string" ? Date.parse(call.startedAt) : 0
      if (opts?.createdAfter && startedAt < opts.createdAfter - 5 * 60 * 1000) continue

      const overrides = call.assistantOverrides as Record<string, unknown> | undefined
      const metadata = overrides?.metadata as Record<string, unknown> | undefined
      if (opts?.track && metadata?.track !== opts.track) continue

      const transcript = typeof call.transcript === "string" ? call.transcript.trim() : ""
      const messages = call.messages
      if (transcript || (Array.isArray(messages) && messages.length > 2)) {
        return id
      }
    }

    return null
  }
}
