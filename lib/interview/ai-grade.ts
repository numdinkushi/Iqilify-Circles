import { GoogleGenerativeAI } from "@google/generative-ai"

import { gradeInterview, type GradeResult } from "@/lib/interview/grade"
import { TRACK_META } from "@/lib/interview/prompts"
import type { InterviewMessage, InterviewTrack, SkillLevel } from "@/lib/interview/types"
import { GEMINI_CONFIG } from "@/lib/vapi/config"

type AiGradePayload = {
  clarity: number
  depth: number
  structure: number
  circlesFit?: number
  overall: number
  feedback: string
  strengths: string[]
  areasForImprovement: string[]
  recommendation: GradeResult["recommendation"]
}

function clampScore(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(num)) return fallback
  return Math.min(100, Math.max(0, Math.round(num)))
}

function buildPrompt(input: {
  track: InterviewTrack
  role: string
  skillLevel: SkillLevel
  transcript: string
}) {
  const meta = TRACK_META[input.track]
  const circlesLine =
    input.track === "builder"
      ? '- "circlesFit": 0-100 — awareness of Circles primitives (CRC, referrals, trust paths, mini-apps, wallet)'
      : ""

  return `You are an expert interview evaluator for IQlify on Circles.

Interview context:
- Track: ${meta.title} — ${meta.subtitle}
- Role: ${input.role}
- Level: ${input.skillLevel}

Transcript:
${input.transcript}

Grade ONLY the candidate's answers. Be fair but honest — short or vague answers should score lower.

Return ONLY valid JSON (no markdown):
{
  "clarity": 0-100,
  "depth": 0-100,
  "structure": 0-100,
  ${circlesLine ? `"circlesFit": 0-100,` : ""}
  "overall": 0-100,
  "feedback": "2-3 sentence summary",
  "strengths": ["up to 3 specific strengths"],
  "areasForImprovement": ["up to 4 actionable tips"],
  "recommendation": "strong-hire" | "hire" | "maybe" | "no-hire" | "retry"
}

Use "retry" only if the candidate barely spoke or there is nothing to evaluate.`
}

function parseAiGrade(raw: string, track: InterviewTrack): AiGradePayload | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as Partial<AiGradePayload>

    const clarity = clampScore(parsed.clarity)
    const depth = clampScore(parsed.depth)
    const structure = clampScore(parsed.structure)
    const circlesFit = track === "builder" ? clampScore(parsed.circlesFit, clarity) : undefined
    const overall = clampScore(
      parsed.overall,
      circlesFit !== undefined
        ? Math.round((clarity + depth + structure + circlesFit) / 4)
        : Math.round((clarity + depth + structure) / 3),
    )

    const recommendation = parsed.recommendation
    const validRecommendations = ["strong-hire", "hire", "maybe", "no-hire", "retry"] as const
    const safeRecommendation = validRecommendations.includes(
      recommendation as (typeof validRecommendations)[number],
    )
      ? (recommendation as GradeResult["recommendation"])
      : "maybe"

    return {
      clarity,
      depth,
      structure,
      circlesFit,
      overall,
      feedback: typeof parsed.feedback === "string" ? parsed.feedback.trim() : "Interview evaluated.",
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.filter((item): item is string => typeof item === "string").slice(0, 3)
        : [],
      areasForImprovement: Array.isArray(parsed.areasForImprovement)
        ? parsed.areasForImprovement
            .filter((item): item is string => typeof item === "string")
            .slice(0, 4)
        : [],
      recommendation: safeRecommendation,
    }
  } catch {
    return null
  }
}

export async function gradeWithAi(input: {
  track: InterviewTrack
  role: string
  skillLevel: SkillLevel
  messages: InterviewMessage[]
  transcript: string
}): Promise<GradeResult | null> {
  if (!GEMINI_CONFIG.apiKey) return null

  const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.apiKey)
  const model = genAI.getGenerativeModel({
    model: GEMINI_CONFIG.defaultModel,
    generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
  })

  const prompt = buildPrompt({
    track: input.track,
    role: input.role,
    skillLevel: input.skillLevel,
    transcript: input.transcript,
  })

  const result = await model.generateContent(prompt)
  const parsed = parseAiGrade(result.response.text(), input.track)
  if (!parsed) return null

  return {
    score: {
      clarity: parsed.clarity,
      depth: parsed.depth,
      structure: parsed.structure,
      ...(input.track === "builder" ? { circlesFit: parsed.circlesFit ?? parsed.clarity } : {}),
      overall: parsed.overall,
    },
    feedback: parsed.feedback,
    strengths: parsed.strengths,
    areasForImprovement: parsed.areasForImprovement,
    recommendation: parsed.recommendation,
  }
}

export async function gradeInterviewSmart(input: {
  track: InterviewTrack
  role: string
  skillLevel: SkillLevel
  messages: InterviewMessage[]
  transcript: string
  expectedDurationMinutes?: number
}): Promise<GradeResult & { source: "ai" | "local" }> {
  const candidateAnswers = input.messages.filter((message) => message.role === "candidate")

  if (candidateAnswers.length === 0) {
    return { ...gradeInterview(input), source: "local" }
  }

  try {
    const aiResult = await gradeWithAi(input)
    if (aiResult && aiResult.recommendation !== "retry") {
      return { ...aiResult, source: "ai" }
    }
  } catch (error) {
    console.error("AI grading failed, using local fallback:", error)
  }

  return { ...gradeInterview(input), source: "local" }
}
