import { GoogleGenerativeAI } from "@google/generative-ai"

import { GEMINI_CONFIG } from "@/lib/vapi/config"

export class GeminiService {
  private genAI: GoogleGenerativeAI
  private model: string

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || GEMINI_CONFIG.apiKey
    if (!key) throw new Error("Gemini API key is required")
    this.genAI = new GoogleGenerativeAI(key)
    this.model = model || GEMINI_CONFIG.defaultModel
  }

  async generateInterviewerLine(prompt: string) {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 },
    })
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  }

  async analyzeInterviewTranscript(
    transcript: string,
    role: string,
    level: string,
    techstack: string[] = []
  ) {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    })

    const prompt = this.buildGradingPrompt(transcript, role, level, techstack)
    const result = await model.generateContent(prompt)
    return this.parseGradingResponse(result.response.text())
  }

  private buildGradingPrompt(
    transcript: string,
    role: string,
    level: string,
    techstack: string[]
  ) {
    return `You are an expert technical interviewer and evaluator. Analyze the following interview transcript and provide comprehensive grading.

**Interview Context:**
- Role: ${role}
- Level: ${level}
- Tech Stack: ${techstack.join(", ") || "General"}

**Interview Transcript:**
${transcript}

**Evaluation Criteria:**
1. Technical Knowledge (0-10)
2. Communication Skills (0-10)
3. Problem-Solving (0-10)
4. Experience Relevance (0-10)
5. Cultural Fit (0-10)

**Required JSON Format:**
{
  "overallScore": number (0-10),
  "sections": {
    "technical": { "score": number, "feedback": "string", "strengths": [], "improvements": [] },
    "communication": { "score": number, "feedback": "string", "strengths": [], "improvements": [] },
    "problemSolving": { "score": number, "feedback": "string", "strengths": [], "improvements": [] },
    "experienceRelevance": { "score": number, "feedback": "string", "strengths": [], "improvements": [] },
    "culturalFit": { "score": number, "feedback": "string", "strengths": [], "improvements": [] }
  },
  "recommendation": "hire|no-hire|maybe",
  "summary": "Overall assessment summary",
  "keyHighlights": [],
  "areasForImprovement": []
}

Return ONLY the JSON object, no additional text.`
  }

  private parseGradingResponse(response: string) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("No JSON object found in response")
      const grading = JSON.parse(jsonMatch[0])
      if (!grading.overallScore || !grading.sections || !grading.recommendation) {
        throw new Error("Invalid grading structure")
      }
      return grading
    } catch {
      return {
        overallScore: 5,
        sections: {
          technical: { score: 5, feedback: "Unable to analyze transcript", strengths: [], improvements: [] },
          communication: { score: 5, feedback: "Unable to analyze transcript", strengths: [], improvements: [] },
          problemSolving: { score: 5, feedback: "Unable to analyze transcript", strengths: [], improvements: [] },
          experienceRelevance: { score: 5, feedback: "Unable to analyze transcript", strengths: [], improvements: [] },
          culturalFit: { score: 5, feedback: "Unable to analyze transcript", strengths: [], improvements: [] },
        },
        recommendation: "maybe",
        summary: "Analysis failed - manual review required",
        keyHighlights: [],
        areasForImprovement: ["Transcript analysis failed"],
      }
    }
  }
}
