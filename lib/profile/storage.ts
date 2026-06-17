export type UserProfile = {
  address: string
  displayName?: string
  avatarUrl?: string
  updatedAt?: number
}

const PROFILE_CACHE_PREFIX = "iqlify:profile:"

export function normalizeProfileAddress(address: string) {
  return address.toLowerCase()
}

export function cacheProfileLocally(profile: UserProfile) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    `${PROFILE_CACHE_PREFIX}${normalizeProfileAddress(profile.address)}`,
    JSON.stringify(profile)
  )
}

export function loadCachedProfile(address: string): UserProfile | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(
    `${PROFILE_CACHE_PREFIX}${normalizeProfileAddress(address)}`
  )
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function profileInitials(name?: string, address?: string) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }
  if (address) return address.slice(2, 4).toUpperCase()
  return "?"
}
