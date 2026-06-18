import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

export const create = mutation({
  args: {
    sessionId: v.string(),
    track: v.union(v.literal("technical"), v.literal("behavioral"), v.literal("builder")),
    role: v.string(),
    company: v.string(),
    duration: v.number(),
    skillLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    interviewType: v.string(),
    walletAddress: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("grading"),
      v.literal("completed"),
      v.literal("failed")
    ),
    voiceMode: v.optional(v.union(v.literal("vapi"), v.literal("browser"))),
    vapiCallId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first()

    if (existing) return existing._id

    return ctx.db.insert("sessions", {
      ...args,
      debriefUnlocked: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    sessionId: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("grading"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
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
    debriefUnlocked: v.optional(v.boolean()),
    rewardClaimed: v.optional(v.boolean()),
    rewardTxHash: v.optional(v.string()),
    rewardAmountCrc: v.optional(v.number()),
    walletAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, ...updates } = args
    const record = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first()

    if (!record) throw new Error("Session not found")

    const clean = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    )

    await ctx.db.patch(record._id, { ...clean, updatedAt: Date.now() })
    return record._id
  },
})

export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first()
  },
})

export const addLeaderboardEntry = mutation({
  args: {
    sessionId: v.string(),
    address: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    track: v.union(v.literal("technical"), v.literal("behavioral"), v.literal("builder")),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("leaderboard")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        displayName: args.displayName,
        ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
      })
      return existing._id
    }

    return ctx.db.insert("leaderboard", {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const listLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("leaderboard").collect()
    return rows
      .sort((a, b) => b.score - a.score)
      .slice(0, args.limit ?? 50)
  },
})

export const health = query({
  args: {},
  handler: async () => {
    return { ok: true, service: "iqlify-convex" }
  },
})
