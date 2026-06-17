"use client"

import { useCallback, useEffect, useState } from "react"

import { useWallet } from "@/components/wallet/wallet-provider"
import {
  formatTimelineWhen,
  loadTimeline,
  recordTimelineEvent,
  type TimelineEvent,
  type TimelineEventType,
} from "@/lib/timeline/storage"

export function useTimeline() {
  const { address } = useWallet()
  const [events, setEvents] = useState<TimelineEvent[]>([])

  const refresh = useCallback(() => {
    if (!address) {
      setEvents([])
      return
    }
    setEvents(loadTimeline(address))
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  const record = useCallback(
    (event: Omit<TimelineEvent, "id" | "createdAt"> & { id?: string; createdAt?: number }) => {
      if (!address) return
      recordTimelineEvent(address, event)
      refresh()
    },
    [address, refresh]
  )

  return { events, refresh, record, formatWhen: formatTimelineWhen }
}

export function useRecordTimelineOnMount(
  address: string | null | undefined,
  event: { type: TimelineEventType; title: string; detail?: string; value?: number } | null
) {
  const { record } = useTimeline()

  useEffect(() => {
    if (!address || !event) return
    record(event)
    // record once per mount + event signature
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, event?.type, event?.title, event?.value])
}
