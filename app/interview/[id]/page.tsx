import { Suspense } from "react"

import { InterviewSession } from "@/components/interview/interview-session"

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading session…</div>}>
      <InterviewSession sessionId={id} />
    </Suspense>
  )
}
