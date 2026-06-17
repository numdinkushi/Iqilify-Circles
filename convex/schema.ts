import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  sessions: defineTable({
    sessionId: v.string(),
    track: v.union(v.literal("technical"), v.literal("behavioral"), v.literal("builder")),
    role: v.string(),
    company: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("grading"),
      v.literal("completed"),
      v.literal("failed")
    ),
    duration: v.number(),
    skillLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    interviewType: v.string(),
    walletAddress: v.optional(v.string()),
    voiceMode: v.optional(v.union(v.literal("vapi"), v.literal("browser"))),
    vapiCallId: v.optional(v.string()),
    localTranscript: v.optional(v.string()),
    overallScore: v.optional(v.number()),
    clarity: v.optional(v.number()),
    depth: v.optional(v.number()),
    structure: v.optional(v.number()),
    circlesFit: v.optional(v.number()),
    feedback: v.optional(v.string()),
    strengths: v.optional(v.array(v.string())),
    areasForImprovement: v.optional(v.array(v.string())),
    recommendation: v.optional(v.string()),
    debriefUnlocked: v.boolean(),
    rewardClaimed: v.optional(v.boolean()),
    rewardTxHash: v.optional(v.string()),
    rewardAmountCrc: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_wallet", ["walletAddress"])
    .index("by_status", ["status"])
    .index("by_score", ["overallScore"]),

  leaderboard: defineTable({
    sessionId: v.string(),
    address: v.string(),
    displayName: v.string(),
    track: v.union(v.literal("technical"), v.literal("behavioral"), v.literal("builder")),
    score: v.number(),
    createdAt: v.number(),
  })
    .index("by_score", ["score"])
    .index("by_session", ["sessionId"]),
})
