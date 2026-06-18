import { parseVapiError } from "@/lib/vapi/parse-error"

export interface VapiCallConfig {
  assistantId: string
  sessionId?: string
  duration?: number
  role?: string
  company?: string
  track?: string
  skillLevel?: string
  onCallStart?: (callId?: string) => void
  onCallEnd?: (callId?: string) => void
  onError?: (error: unknown) => void
  onMessage?: (message: unknown) => void
}

type VapiInstance = InstanceType<(typeof import("@vapi-ai/web"))["default"]>

export class VapiService {
  private static instance: VapiService
  private currentCall: VapiInstance | null = null
  private activeCallId: string | null = null
  /** Persists after hangup so grading can still read the call id. */
  private lastCallId: string | null = null

  private constructor() {}

  static getInstance(): VapiService {
    if (!VapiService.instance) VapiService.instance = new VapiService()
    return VapiService.instance
  }

  async startCall(config: VapiCallConfig) {
    if (!config.assistantId) throw new Error("Assistant ID is required for VAPI calls")

    const apiKey =
      process.env.NEXT_PUBLIC_VAPI_WEBTOKEN ||
      process.env.NEXT_PUBLIC_VAPI_API_KEY ||
      ""

    if (!apiKey) throw new Error("NEXT_PUBLIC_VAPI_WEBTOKEN is not configured")

    if (this.currentCall) {
      try {
        await this.currentCall.stop()
      } catch {
        // ignore stale call cleanup errors
      }
      this.currentCall = null
      this.activeCallId = null
      this.lastCallId = null
    }

    const Vapi = (await import("@vapi-ai/web")).default
    this.currentCall = new Vapi(apiKey)

    this.currentCall.on("call-start", () => {
      config.onCallStart?.(this.activeCallId ?? undefined)
    })

    this.currentCall.on("call-start-success", (event: { callId?: string }) => {
      if (event.callId) {
        this.activeCallId = event.callId
        this.lastCallId = event.callId
        config.onCallStart?.(event.callId)
      }
    })

    this.currentCall.on("call-start-failed", (event: { error?: string }) => {
      config.onError?.(new Error(event.error || "Failed to start call"))
    })

    this.currentCall.on("call-end", () => {
      this.activeCallId = null
      config.onCallEnd?.(this.lastCallId ?? undefined)
    })

    this.currentCall.on("error", (error: unknown) => {
      config.onError?.(error)
    })

    if (config.onMessage) {
      this.currentCall.on("message", (message: unknown) => config.onMessage?.(message))
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      stream.getTracks().forEach((track) => track.stop())
    } catch (micError) {
      throw new Error(
        micError instanceof Error
          ? `Microphone access required: ${micError.message}`
          : "Microphone access is required for voice interviews"
      )
    }

    const assistantOverrides: Record<string, unknown> = {
      firstMessage: `Hi! I'm your interviewer today for the ${config.role || "role"} position${config.company ? ` at ${config.company}` : ""}. Tell me a bit about yourself to get started.`,
      metadata: {
        sessionId: config.sessionId,
        role: config.role,
        company: config.company,
        track: config.track,
        skillLevel: config.skillLevel,
      },
    }

    if (config.duration) {
      assistantOverrides.maxDurationSeconds = config.duration * 60
    }

    try {
      const call = await this.currentCall.start(config.assistantId, assistantOverrides)
      if (call?.id) {
        this.activeCallId = call.id
        this.lastCallId = call.id
      }
      return call
    } catch (error) {
      throw new Error(parseVapiError(error))
    }
  }

  async endCall() {
    if (this.currentCall) {
      await this.currentCall.stop()
      this.currentCall = null
      this.activeCallId = null
    }
  }

  setMuted(muted: boolean) {
    this.currentCall?.setMuted(muted)
  }

  getCurrentCall() {
    return this.currentCall
  }

  getActiveCallId() {
    return this.activeCallId
  }

  getCallIdForGrading() {
    return this.lastCallId || this.activeCallId
  }

  isCallActive() {
    return this.currentCall !== null
  }
}

export function getAssistantIdForTrack(track: string): string {
  const map: Record<string, string | undefined> = {
    technical: process.env.NEXT_PUBLIC_VAPI_TECHNICAL_ASSISTANT_ID,
    behavioral: process.env.NEXT_PUBLIC_VAPI_BEHAVIORAL_ASSISTANT_ID,
    builder: process.env.NEXT_PUBLIC_VAPI_TECHNICAL_ASSISTANT_ID,
    soft_skills: process.env.NEXT_PUBLIC_VAPI_SOFT_SKILLS_ASSISTANT_ID,
    system_design: process.env.NEXT_PUBLIC_VAPI_SYSTEM_DESIGN_ASSISTANT_ID,
  }
  return (
    map[track] ||
    process.env.NEXT_PUBLIC_VAPI_TECHNICAL_ASSISTANT_ID ||
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
    ""
  )
}
