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
}
