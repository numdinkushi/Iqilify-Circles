"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import {
  clearPersistedDuelChallenge,
  loadPersistedDuelChallenge,
  parseDuelFromSearchParams,
  persistDuelChallenge,
  type DuelChallenge,
} from "@/lib/duel/challenge"

export function useDuelChallenge() {
  const searchParams = useSearchParams()
  const [challenge, setChallenge] = useState<DuelChallenge | null>(null)

  useEffect(() => {
    const fromUrl = parseDuelFromSearchParams(searchParams)
    if (fromUrl) {
      persistDuelChallenge(fromUrl)
      setChallenge(fromUrl)
      return
    }
    setChallenge(loadPersistedDuelChallenge())
  }, [searchParams])

  const clear = useCallback(() => {
    clearPersistedDuelChallenge()
    setChallenge(null)
  }, [])

  return { challenge, clear }
}
