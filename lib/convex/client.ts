"use client"

import { useCallback } from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import { isConvexConfigured } from "@/components/providers/convex-provider"
import type { InterviewSession } from "@/lib/interview/types"

export function useConvexLeaderboard(limit = 50) {
  return useQuery(api.sessions.listLeaderboard, isConvexConfigured() ? { limit } : "skip")
}

export function useSyncSessionToConvex() {
  const create = useMutation(api.sessions.create)
  const update = useMutation(api.sessions.update)

  const syncSession = useCallback(
    async (session: InterviewSession) => {
      if (!isConvexConfigured()) return

      const base = {
        sessionId: session.id,
        track: session.track,
        role: session.role,
        company: session.company,
        duration: session.duration,
        skillLevel: session.skillLevel,
        interviewType: session.interviewType,
        walletAddress: session.walletAddress,
        status: session.status,
        voiceMode: session.voiceMode,
        vapiCallId: session.vapiCallId,
      }

      try {
        await create({
          ...base,
          status: session.status === "pending" ? "pending" : session.status,
        })
      } catch {
        // record may already exist
      }

      await update({
        sessionId: session.id,
        status: session.status,
        voiceMode: session.voiceMode,
        vapiCallId: session.vapiCallId,
        localTranscript: session.localTranscript,
        overallScore: session.score?.overall,
        clarity: session.score?.clarity,
        depth: session.score?.depth,
        structure: session.score?.structure,
        circlesFit: session.score?.circlesFit,
        feedback: session.feedback,
        strengths: session.strengths,
        areasForImprovement: session.areasForImprovement,
        recommendation: session.recommendation,
        debriefUnlocked: session.debriefUnlocked,
        rewardClaimed: session.rewardClaimed,
        rewardTxHash: session.rewardTxHash,
        rewardAmountCrc: session.rewardAmountCrc,
      })
    },
    [create, update]
  )

  return { syncSession }
}

export function useAddLeaderboardToConvex() {
  return useMutation(api.sessions.addLeaderboardEntry)
}
