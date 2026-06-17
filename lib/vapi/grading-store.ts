import type { GradingRecord } from "@/lib/vapi/types"

const globalForGrading = globalThis as unknown as {
  iqlifyGradingStore?: Map<string, GradingRecord>
}

export const gradingStore =
  globalForGrading.iqlifyGradingStore ?? new Map<string, GradingRecord>()

globalForGrading.iqlifyGradingStore = gradingStore

export function storeGrading(
  id: string,
  gradingResults: Record<string, unknown>,
  opts?: { callId?: string; sessionId?: string }
) {
  const record: GradingRecord = {
    id,
    callId: opts?.callId ?? null,
    sessionId: opts?.sessionId ?? null,
    gradingResults,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
  gradingStore.set(id, record)
  if (opts?.callId && opts.callId !== id) gradingStore.set(opts.callId, record)
  if (opts?.sessionId && opts.sessionId !== id) gradingStore.set(opts.sessionId, record)
  return record
}

export function getGrading(id: string): GradingRecord | undefined {
  return gradingStore.get(id)
}
