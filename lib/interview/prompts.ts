import type { InterviewTrack } from "@/lib/interview/types"

export const TRACK_META: Record<
  InterviewTrack,
  { title: string; subtitle: string; icon: string; color: string }
> = {
  technical: {
    title: "CompetentIQ",
    subtitle: "Technical depth, problem-solving, clear articulation",
    icon: "⚡",
    color: "from-violet-500/15 to-indigo-500/5",
  },
  behavioral: {
    title: "ReflectIQ",
    subtitle: "Self-awareness, stories, emotional intelligence",
    icon: "🪞",
    color: "from-rose-500/15 to-orange-500/5",
  },
  builder: {
    title: "BuilderIQ",
    subtitle: "Circles primitives, UX, referrals, shipping mindset",
    icon: "🔧",
    color: "from-emerald-500/15 to-teal-500/5",
  },
}

export const QUESTION_BANK: Record<InterviewTrack, string[]> = {
  technical: [
    "Walk me through how you would debug a production issue users only see on mobile.",
    "Explain a system you built where tradeoffs mattered. What did you sacrifice and why?",
    "How do you decide between shipping fast and building for scale?",
    "Describe a time you simplified a complex codebase. What was your approach?",
    "How would you design an API that needs to stay reliable under bursty traffic?",
  ],
  behavioral: [
    "Tell me about a time you disagreed with a teammate. How did you handle it?",
    "Describe a project where you had incomplete requirements. What did you do?",
    "Give me an example of feedback that changed how you work.",
    "Tell me about a failure you owned. What did you learn?",
    "How do you prioritize when everything feels urgent?",
  ],
  builder: [
    "Why would you build a mini-app on Circles instead of a standalone web app?",
    "How would you design a flow where a non-crypto user opens your app twice?",
    "What Circles primitives would you use to drive referrals inside your mini-app?",
    "How would you judge whether CRC is core to your product or bolted on?",
    "You have until Sunday to ship. What do you cut and what do you keep?",
  ],
}

export const DEBRIEF_COST_CRC = 2
