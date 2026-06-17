"use client"

import * as React from "react"
import { AlertCircle, ArrowLeft, LoaderCircle, Sparkles, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IntelligentGradingSystem } from "@/lib/intelligent-grading"
import { useSyncSessionToConvex } from "@/lib/convex/client"
import { saveSession } from "@/lib/interview/storage"
import { gradingToScoreBreakdown, type InterviewSession } from "@/lib/interview/types"

type GradingData = {
  overallScore?: number
  summary?: string
  keyHighlights?: string[]
  areasForImprovement?: string[]
  recommendation?: string
}

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export function GradingScreen({ session }: { session: InterviewSession }) {
  const router = useRouter()
  const { syncSession } = useSyncSessionToConvex()
  const gradedRef = React.useRef(false)
  const [isGrading, setIsGrading] = React.useState(() => !session.completed || !session.score)
  const [error, setError] = React.useState<string | null>(null)
  const [finalScore, setFinalScore] = React.useState(0)
  const [feedback, setFeedback] = React.useState("")
  const [strengths, setStrengths] = React.useState<string[]>([])
  const [improvements, setImprovements] = React.useState<string[]>([])
  const [recommendation, setRecommendation] = React.useState("maybe")

  React.useEffect(() => {
    if (gradedRef.current || session.completed) return
    gradedRef.current = true

    let cancelled = false
    const sessionId = session.id

    async function grade() {
      try {
        let gradingData: GradingData | null = null

        const gradeRes = await fetch("/api/vapi/grade-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            vapiCallId: session.vapiCallId,
            role: session.role,
            skillLevel: session.skillLevel,
            duration: session.duration,
            interviewType: session.interviewType,
            transcript: session.localTranscript,
          }),
        })

        if (gradeRes.ok) {
          const gradeResult = await gradeRes.json()
          if (gradeResult.success && gradeResult.gradingResults) {
            gradingData = gradeResult.gradingResults as GradingData
          }
        }

        if (!gradingData) {
          const lookupId = session.vapiCallId || session.id
          for (let attempt = 0; attempt < 6; attempt++) {
            const res = await fetch(
              `/api/vapi/grading?callId=${lookupId}&sessionId=${session.id}`
            )
            if (res.ok) {
              const data = await res.json()
              if (data.success && data.gradingResults) {
                gradingData = data.gradingResults as GradingData
                break
              }
            }
            await new Promise((r) => setTimeout(r, 2000))
          }
        }

        if (!gradingData && session.vapiCallId && isValidUUID(session.vapiCallId)) {
          const callRes = await fetch(`/api/vapi/call?callId=${session.vapiCallId}`)
          if (callRes.ok) {
            const callResult = await callRes.json()
            const callData = callResult.callData

            let transcript = ""
            if (Array.isArray(callData.transcript)) {
              transcript = callData.transcript
                .map((msg: { role?: string; content?: string; text?: string }) =>
                  `${msg.role || "Unknown"}: ${msg.content || msg.text || ""}`
                )
                .join("\n")
            } else if (typeof callData.transcript === "string") {
              transcript = callData.transcript
            }

            const duration = Number(callData.duration) || session.duration * 60
            const transcriptWords = transcript.split(/\s+/).filter(Boolean).length
            const candidateMessageCount = (transcript.toLowerCase().match(/user:|candidate:/g) || []).length

            let aiScore: number | undefined
            if (transcriptWords >= 50) {
              const analyzeRes = await fetch("/api/vapi/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  transcript,
                  role: session.role,
                  level: session.skillLevel,
                }),
              })
              if (analyzeRes.ok) {
                const analyzeData = await analyzeRes.json()
                if (analyzeData.success && analyzeData.grading?.overallScore) {
                  aiScore = analyzeData.grading.overallScore
                }
              }
            }

            const result = IntelligentGradingSystem.gradeInterview(
              {
                duration,
                transcriptLength: transcript.length,
                transcriptWords,
                candidateMessageCount: Math.max(candidateMessageCount, 1),
                transcript: transcript || "No transcript",
                interviewType: session.interviewType,
                skillLevel: session.skillLevel,
                expectedDuration: session.duration * 60,
              },
              aiScore
            )

            gradingData = {
              overallScore: result.score / 10,
              summary: result.feedback,
              keyHighlights: result.strengths,
              areasForImprovement: result.areasForImprovement,
              recommendation: result.recommendation,
            }

            await fetch("/api/vapi/grading", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                callId: session.vapiCallId,
                sessionId: session.id,
                gradingResults: gradingData,
              }),
            })
          }
        }

        if (!gradingData) {
          const result = IntelligentGradingSystem.gradeInterview({
            duration: session.duration * 60,
            transcriptLength: 0,
            transcriptWords: 0,
            candidateMessageCount: 0,
            transcript: "",
            interviewType: session.interviewType,
            skillLevel: session.skillLevel,
            expectedDuration: session.duration * 60,
          })
          gradingData = {
            overallScore: result.score / 10,
            summary: result.feedback,
            keyHighlights: result.strengths,
            areasForImprovement: result.areasForImprovement,
            recommendation: result.recommendation,
          }
        }

        if (cancelled) return

        const rawScore = gradingData?.overallScore ?? 0
        const score = Math.min(100, Math.max(0, Math.round(rawScore * 10)))
        const scoreBreakdown = gradingToScoreBreakdown(rawScore, session.track)

        const completed: InterviewSession = {
          ...session,
          status: "completed",
          completed: true,
          score: { ...scoreBreakdown, overall: score },
          feedback: gradingData?.summary || "Interview evaluation completed.",
          strengths: gradingData?.keyHighlights || [],
          areasForImprovement: gradingData?.areasForImprovement || [],
          recommendation: gradingData?.recommendation || "maybe",
        }
        saveSession(completed)
        void syncSession(completed)

        setFinalScore(score)
        setFeedback(completed.feedback || "")
        setStrengths(completed.strengths || [])
        setImprovements(completed.areasForImprovement || [])
        setRecommendation(completed.recommendation || "maybe")
        setIsGrading(false)
        router.replace(`/interview/${sessionId}`)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Grading failed")
          setIsGrading(false)
        }
      }
    }

    grade()
    return () => {
      cancelled = true
    }
  }, [session.id, session.completed, syncSession, router])

  if (isGrading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <LoaderCircle className="size-10 animate-spin text-emerald-600" />
          <div>
            <p className="font-medium">Grading your interview</p>
            <p className="text-sm text-muted-foreground">
              Analyzing transcript with AI…
            </p>
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
        <CardDescription>Score: {finalScore}/100 · {recommendation}</CardDescription>
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
              {strengths.map((s) => (
                <li key={s}>• {s}</li>
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
              {improvements.map((s) => (
                <li key={s}>• {s}</li>
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
