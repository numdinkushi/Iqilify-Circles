export const VAPI_CONFIG = {
  baseUrl: "https://api.vapi.ai",
  apiKey: process.env.VAPI_API_KEY || "",
  webhookSecret: process.env.VAPI_WEBHOOK_SECRET || "",
  webhookUrl: process.env.NEXT_PUBLIC_WEBHOOK_URL || "",
} as const

export const GEMINI_CONFIG = {
  apiKey:
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    "",
  defaultModel: "gemini-2.0-flash",
  defaultTemperature: 0.7,
  maxOutputTokens: 2048,
} as const

/** Set GEMINI_VOICE_TURNS=true once your Gemini API key has quota. */
export function isGeminiVoiceTurnsEnabled() {
  return process.env.GEMINI_VOICE_TURNS === "true" && !!GEMINI_CONFIG.apiKey
}

export const WEBHOOK_EVENTS = {
  FUNCTION_CALL: "function-call",
  CONVERSATION_UPDATE: "conversation-update",
  END_OF_CALL: "end-of-call-report",
  STATUS_UPDATE: "status-update",
} as const
