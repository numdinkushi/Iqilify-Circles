import { Suspense } from "react"

import { InterviewRoom } from "@/components/interview/interview-room"
import { Card, CardContent } from "@/components/ui/card"
import { LoaderCircle } from "lucide-react"

function InterviewFallback() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Loading interview room…
      </CardContent>
    </Card>
  )
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<InterviewFallback />}>
      <InterviewRoom />
    </Suspense>
  )
}
