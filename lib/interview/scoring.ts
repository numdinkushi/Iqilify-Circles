import type { InterviewMessage, InterviewTrack, ScoreBreakdown } from "@/lib/interview/types"

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function scoreSession(
  track: InterviewTrack,
  messages: InterviewMessage[],
): ScoreBreakdown {
  const answers = messages.filter((message) => message.role === "candidate")
  const avgWords =
    answers.reduce((sum, answer) => sum + wordCount(answer.content), 0) /
    Math.max(answers.length, 1)

  const clarity = clamp(Math.round(40 + Math.min(avgWords, 120) * 0.45))
  const depth = clamp(Math.round(30 + answers.length * 12 + Math.min(avgWords, 80) * 0.35))
  const structure = clamp(
    Math.round(
      35 +
        answers.filter((answer) => /because|first|then|result|learned/i.test(answer.content))
          .length *
          10,
    ),
  )

  const circlesFit =
    track === "builder"
      ? clamp(
          Math.round(
            30 +
              answers.filter((answer) =>
                /crc|circles|trust|referral|mini-?app|wallet|primitive/i.test(answer.content),
              ).length * 12,
          ),
        )
      : undefined

  const overall = circlesFit
    ? Math.round((clarity + depth + structure + circlesFit) / 4)
    : Math.round((clarity + depth + structure) / 3)

  return { clarity, depth, structure, circlesFit, overall }
}

export function buildFeedback(track: InterviewTrack, score: ScoreBreakdown): string[] {
  const tips: string[] = []

  if (score.clarity < 70) {
    tips.push("Lead with your conclusion, then support it with one concrete example.")
  }
  if (score.depth < 70) {
    tips.push("Add specifics: metrics, constraints, and what you would do differently.")
  }
  if (score.structure < 70) {
    tips.push("Use a simple frame: situation → action → result → learning.")
  }
  if (track === "builder" && (score.circlesFit ?? 0) < 70) {
    tips.push("Name Circles primitives directly: referrals, trust paths, profiles, transfer data.")
  }
  if (tips.length === 0) {
    tips.push("Strong session. Tighten your opener and end with a crisp recommendation.")
  }

  return tips
}
