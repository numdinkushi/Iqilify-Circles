export function parseVapiError(error: unknown): string {
  if (!error) return "Call failed"

  if (typeof error === "string") return error

  if (error instanceof Error) {
    return parseVapiError(error.message)
  }

  if (typeof error === "object") {
    const obj = error as Record<string, unknown>
    if (typeof obj.message === "string") return obj.message
    if (typeof obj.error === "string") return obj.error
    if (typeof obj.errorMsg === "string") return obj.errorMsg
    if (obj.error && typeof obj.error === "object") {
      const nested = obj.error as Record<string, unknown>
      if (typeof nested.message === "string") return nested.message
    }
    try {
      const raw = JSON.stringify(error)
      const match = raw.match(/"message":"([^"]+)"/)
      if (match?.[1]) return match[1]
    } catch {
      // ignore
    }
  }

  return "Call failed"
}

export function isVapiBillingError(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes("wallet balance") ||
    lower.includes("balance is 0") ||
    lower.includes("purchase credits") ||
    lower.includes("insufficient credits") ||
    lower.includes("payment required")
  )
}
