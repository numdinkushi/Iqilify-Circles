import { GeminiService } from "@/lib/vapi/gemini-service"
import { IntelligentGradingSystem, type InterviewMetrics } from "@/lib/intelligent-grading"

function extractTranscript(callData: Record<string, unknown>): string {
  const transcript = callData.transcript
  if (Array.isArray(transcript)) {
    return transcript
      .map((msg: { role?: string; content?: string; text?: string }) =>
        `${msg.role || "Unknown"}: ${msg.content || msg.text || ""}`
      )
      .join("\n")
  }
  if (typeof transcript === "string") return transcript

  const messages = callData.messages
  if (Array.isArray(messages)) {
    return messages
      .map((msg: { role?: string; content?: string; text?: string }) =>
        `${msg.role || "Unknown"}: ${msg.content || msg.text || ""}`
      )
      .join("\n")
  }
  return ""
}

export async function gradeFromCallData(
  callId: string,
  callData: Record<string, unknown>,
  opts?: { role?: string; skillLevel?: string; expectedDurationMinutes?: number; interviewType?: string }
) {
  const transcript = extractTranscript(callData)
  const callDuration = Number(callData.duration) || 0
  const transcriptWords = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0
  const candidateMessageCount = (transcript.toLowerCase().match(/user:|candidate:/g) || []).length

  const interviewMetrics: InterviewMetrics = {
    duration: callDuration,
    transcriptLength: transcript.length,
    transcriptWords,
    candidateMessageCount: Math.max(candidateMessageCount, 1),
    transcript: transcript || "Interview transcript not available",
    interviewType: opts?.interviewType || "technical",
    skillLevel: opts?.skillLevel || "intermediate",
    expectedDuration: (opts?.expectedDurationMinutes || 10) * 60,
  }

  let aiScore: number | undefined
  if (transcriptWords >= 50 && candidateMessageCount >= 2) {
    try {
      const gemini = new GeminiService()
      const aiGrading = await gemini.analyzeInterviewTranscript(
        transcript,
        opts?.role || "Software Engineer",
        opts?.skillLevel === "beginner" ? "Junior" : opts?.skillLevel === "advanced" ? "Senior" : "Mid-level",
        []
      )
      if (typeof aiGrading.overallScore === "number" && !Number.isNaN(aiGrading.overallScore)) {
        aiScore = Math.max(0, Math.min(10, aiGrading.overallScore))
      }
    } catch (error) {
      console.error("Gemini grading failed:", error)
    }
  }

  const intelligentResult = IntelligentGradingSystem.gradeInterview(interviewMetrics, aiScore)

  return {
    callId,
    overallScore: intelligentResult.score / 10,
    recommendation: intelligentResult.recommendation,
    summary: intelligentResult.feedback,
    keyHighlights: intelligentResult.strengths,
    areasForImprovement: intelligentResult.areasForImprovement,
    transcriptLength: transcript.length,
    transcriptWordCount: transcriptWords,
    candidateMessageCount,
    callDuration,
    isFailedInterview:
      intelligentResult.status === "technical_issue" ||
      intelligentResult.status === "insufficient_data",
    partialCreditReason: intelligentResult.partialCreditReason,
    technicalIssueReason: intelligentResult.technicalIssueReason,
    timestamp: new Date().toISOString(),
  }
}

export async function gradeFromTranscript(
  callId: string,
  transcript: string,
  opts?: { role?: string; skillLevel?: string; expectedDurationMinutes?: number; interviewType?: string }
) {
  return gradeFromCallData(
    callId,
    { transcript, duration: 0 },
    opts
  )
}
