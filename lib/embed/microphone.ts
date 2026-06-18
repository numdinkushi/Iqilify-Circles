/** True when running inside a parent frame (e.g. Circles playground / miniapps host). */
export function isEmbeddedFrame() {
  if (typeof window === "undefined") return false
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

export function voiceBlockedInEmbedMessage() {
  return "The Circles host iframe does not grant microphone access yet. Open IQlify in a new browser tab for voice interviews — wallet and CRC flows still work inside Circles."
}

/** Current page or path on this deployment (works when opened outside the iframe). */
export function getDirectAppUrl(path?: string) {
  if (typeof window === "undefined") return ""
  const origin = window.location.origin.replace(/\/$/, "")
  if (!path) return window.location.href
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${origin}${normalized}`
}
