import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

const PUBLIC_KEYS = [
  "site_opens",
  "profiles_read",
  "referrals_copied",
  "interviews_completed",
] as const

export const increment = mutation({
  args: { key: v.string(), amount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const amount = args.amount ?? 1
    const existing = await ctx.db
      .query("appStats")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { value: existing.value + amount })
      return existing.value + amount
    }

    await ctx.db.insert("appStats", { key: args.key, value: amount })
    return amount
  },
})

export const getPublic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("appStats").collect()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      siteOpens: map.site_opens ?? 0,
      profilesRead: map.profiles_read ?? 0,
      referralsCopied: map.referrals_copied ?? 0,
      interviewsCompleted: map.interviews_completed ?? 0,
      keys: PUBLIC_KEYS,
    }
  },
})
