import type { InterviewTrack } from "@/lib/interview/types"

const APP_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")

const HOST_BASE =
  process.env.NEXT_PUBLIC_CIRCLES_HOST_URL ?? "https://circles.gnosis.io/playground"

export function buildAppUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, APP_ORIGIN.replace(/\/$/, ""))
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

export function wrapInCirclesPlayground(appUrl: string) {
  return `${HOST_BASE.replace(/\/$/, "")}?url=${encodeURIComponent(appUrl)}`
}

export type ShareLinkKind = "interview" | "leaderboard" | "settings" | "referral"

export type ShareLink = {
  id: ShareLinkKind
  label: string
  description: string
  appUrl: string
  playgroundUrl: string
}

export function buildShareLinks(input?: {
  referralSecret?: string
  track?: InterviewTrack
}): ShareLink[] {
  const interviewParams: Record<string, string> = {}
  if (input?.track) interviewParams.track = input.track

  const interviewApp = buildAppUrl("/interview", interviewParams)
  const leaderboardApp = buildAppUrl("/leaderboard")
  const settingsApp = buildAppUrl("/settings")

  const links: ShareLink[] = [
    {
      id: "interview" as const,
      label: "Start interviewing",
      description: "Open IQlify practice inside Circles",
      appUrl: interviewApp,
      playgroundUrl: wrapInCirclesPlayground(interviewApp),
    },
    {
      id: "leaderboard" as const,
      label: "View leaderboard",
      description: "See top interview scores",
      appUrl: leaderboardApp,
      playgroundUrl: wrapInCirclesPlayground(leaderboardApp),
    },
    {
      id: "settings" as const,
      label: "Customize profile",
      description: "Avatar, quests, and share kit",
      appUrl: settingsApp,
      playgroundUrl: wrapInCirclesPlayground(settingsApp),
    },
  ]

  if (input?.referralSecret) {
    const referralApp = buildAppUrl("/interview", { secret: input.referralSecret })
    links.push({
      id: "referral",
      label: "Referral invite",
      description: "Friend creates a Circles wallet via IQlify",
      appUrl: referralApp,
      playgroundUrl: wrapInCirclesPlayground(referralApp),
    })
  }

  return links
}

export function buildOgImageUrl(params: {
  score?: number
  track?: string
  name?: string
}) {
  const url = new URL("/api/og", APP_ORIGIN.replace(/\/$/, ""))
  if (params.score !== undefined) url.searchParams.set("score", String(params.score))
  if (params.track) url.searchParams.set("track", params.track)
  if (params.name) url.searchParams.set("name", params.name)
  return url.toString()
}

export function buildScoreShareText(input: {
  score: number
  track: InterviewTrack
  displayName?: string
}) {
  const name = input.displayName?.trim() || "I"
  return `${name} scored ${input.score}/100 on IQlify ${input.track} prep — can you beat it?`
}
