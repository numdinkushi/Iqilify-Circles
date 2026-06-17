/** Set NEXT_PUBLIC_VAPI_ENABLED=true after adding Vapi credits at dashboard.vapi.ai */
export function isVapiCallsEnabled() {
  return process.env.NEXT_PUBLIC_VAPI_ENABLED === "true"
}

export const BROWSER_VOICE_REASON =
  "Vapi has no credits. Interview uses browser voice (local questions + speech-to-text)."
