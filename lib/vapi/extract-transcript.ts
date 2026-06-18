import type { InterviewMessage } from "@/lib/interview/types"

type VapiMessage = {
  role?: string
  message?: string
  content?: string
  text?: string
}

function isInterviewerRole(role: string) {
  const lower = role.toLowerCase()
  return lower === "bot" || lower === "assistant" || lower.includes("interviewer")
}

function isCandidateRole(role: string) {
  const lower = role.toLowerCase()
  return lower === "user" || lower.includes("candidate")
}

function pushMessage(messages: InterviewMessage[], role: InterviewMessage["role"], content: string) {
  const trimmed = content.trim()
  if (!trimmed) return
  messages.push({ role, content: trimmed })
}

export function messagesFromVapiLog(rawMessages: unknown): InterviewMessage[] {
  if (!Array.isArray(rawMessages)) return []

  const messages: InterviewMessage[] = []
  for (const entry of rawMessages as VapiMessage[]) {
    const role = entry.role || ""
    const content = entry.message || entry.content || entry.text || ""
    if (!content.trim() || role === "system") continue

    if (isInterviewerRole(role)) {
      pushMessage(messages, "interviewer", content)
    } else if (isCandidateRole(role)) {
      pushMessage(messages, "candidate", content)
    }
  }

  return messages
}

export function messagesFromVapiTranscript(transcript: string): InterviewMessage[] {
  const messages: InterviewMessage[] = []
  const pattern = /^(AI|User|Assistant|Bot|Interviewer|Candidate):\s*(.*)$/gim
  let match: RegExpExecArray | null

  while ((match = pattern.exec(transcript)) !== null) {
    const speaker = match[1].toLowerCase()
    const content = match[2].trim()
    if (!content) continue

    if (speaker === "user" || speaker === "candidate") {
      pushMessage(messages, "candidate", content)
    } else {
      pushMessage(messages, "interviewer", content)
    }
  }

  return messages
}

export function formatMessagesAsTranscript(messages: InterviewMessage[]): string {
  return messages
    .map((message) =>
      `${message.role === "interviewer" ? "Interviewer" : "Candidate"}: ${message.content}`,
    )
    .join("\n")
}

export function extractMessagesFromVapiCall(callData: Record<string, unknown>): InterviewMessage[] {
  const artifact = callData.artifact as Record<string, unknown> | undefined

  const fromMessages = messagesFromVapiLog(callData.messages ?? artifact?.messages)
  if (fromMessages.length > 0) return fromMessages

  const transcript =
    (typeof callData.transcript === "string" ? callData.transcript : "") ||
    (typeof artifact?.transcript === "string" ? artifact.transcript : "")

  if (transcript.trim()) {
    return messagesFromVapiTranscript(transcript)
  }

  return []
}

export function hasCandidateAnswers(messages: InterviewMessage[]) {
  return messages.some((message) => message.role === "candidate" && message.content.trim().length > 0)
}
