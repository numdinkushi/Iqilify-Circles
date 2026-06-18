"use client"

import * as React from "react"
import { AlertCircle, ArrowLeft, LoaderCircle, Sparkles, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSyncSessionToConvex } from "@/lib/convex/client"
import { loadSession, saveSession } from "@/lib/interview/storage"
import type { InterviewSession } from "@/lib/interview/types"

export function GradingScreen({ session }: { session: InterviewSession }) {
  const router = useRouter()
  const { syncSession } = useSyncSessionToConvex()
  const [isGrading, setIsGrading] = React.useState(() => !session.completed || !session.score)
  const [error, setError] = React.useState<string | null>(null)
  const [finalScore, setFinalScore] = React.useState(session.score?.overall ?? 0)
  const [feedback, setFeedback] = React.useState(session.feedback ?? "")
  const [strengths, setStrengths] = React.useState<string[]>(session.strengths ?? [])
  const [improvements, setImprovements] = React.useState<string[]>(session.areasForImprovement ?? [])
  const [recommendation, setRecommendation] = React.useState(session.recommendation ?? "maybe")

  React.useEffect(() => {
    if (session.completed && session.score) {
      setIsGrading(false)
      return
    }

    let cancelled = false

    async function grade() {
      const current = loadSession(session.id) || session

      try {
        const res = await fetch("/api/interview/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: current.id,
            track: current.track,
            role: current.role,
            skillLevel: current.skillLevel,
            duration: current.duration,
            messages: current.messages,
            transcript: current.localTranscript,
          }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Could not grade interview")
        }

        if (cancelled) return

        const completed: InterviewSession = {
          ...current,
          status: "completed",
          completed: true,
          score: data.score,
          feedback: data.feedback,
          strengths: data.strengths,
          areasForImprovement: data.areasForImprovement,
          recommendation: data.recommendation,
        }

        saveSession(completed)
        void syncSession(completed)

        setFinalScore(data.score.overall)
        setFeedback(data.feedback)
        setStrengths(data.strengths)
        setImprovements(data.areasForImprovement)
        setRecommendation(data.recommendation)
        setIsGrading(false)
        router.replace(`/interview/${current.id}`)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Grading failed")
        setIsGrading(false)
      }
    }

    void grade()

    return () => {
      cancelled = true
    }
  }, [session.id, session.completed, session.score, syncSession, router])

  if (isGrading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <LoaderCircle className="size-10 animate-spin text-emerald-600" />
          <div>
            <p className="font-medium">Grading your interview</p>
            <p className="text-sm text-muted-foreground">Scoring your answers…</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-sm">{error}</p>
          <Button variant="outline" onClick={() => router.push("/interview")}>
            <ArrowLeft />
            Back to interviews
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-emerald-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-emerald-600" />
          Grading complete
        </CardTitle>
        <CardDescription>
          Score: {finalScore}/100 · {recommendation}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{feedback}</p>
        {strengths.length > 0 ? (
          <div>
            <Badge variant="secondary" className="mb-2">
              <Sparkles className="mr-1 size-3" />
              Strengths
            </Badge>
            <ul className="space-y-1 text-sm">
              {strengths.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {improvements.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Areas to improve
            </p>
            <ul className="space-y-1 text-sm">
              {improvements.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button className="w-full" onClick={() => router.replace(`/interview/${session.id}`)}>
          View full results
        </Button>
      </CardContent>
    </Card>
  )
}
