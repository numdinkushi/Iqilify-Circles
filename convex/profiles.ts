import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

function normalizeAddress(address: string) {
  return address.toLowerCase()
}

export const getByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(args.address)))
      .first()
  },
})

export const getByAddresses = query({
  args: { addresses: v.array(v.string()) },
  handler: async (ctx, args) => {
    const normalized = args.addresses.map(normalizeAddress)
    const profiles = await ctx.db.query("profiles").collect()
    return profiles.filter((p) => normalized.includes(p.address))
  },
})

export const upsert = mutation({
  args: {
    address: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const address = normalizeAddress(args.address)
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first()

    const now = Date.now()
    const patch = {
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      updatedAt: now,
    }

    if (existing) {
      const clean = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined)
      )
      await ctx.db.patch(existing._id, clean)
      return existing._id
    }

    return ctx.db.insert("profiles", {
      address,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      updatedAt: now,
    })
  },
})
