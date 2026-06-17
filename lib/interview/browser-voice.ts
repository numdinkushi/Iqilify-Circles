type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export function getSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null
  const win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
  const ctor = win.SpeechRecognition || win.webkitSpeechRecognition
  return ctor ? new ctor() : null
}

export function speak(text: string, enabled = true): Promise<void> {
  return new Promise((resolve) => {
    if (!enabled || typeof window === "undefined" || !window.speechSynthesis) {
      resolve()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

export function listenOnce(timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const recognition = getSpeechRecognition()
    if (!recognition) {
      reject(new Error("Speech recognition is not supported in this browser. Use Chrome."))
      return
    }

    let finished = false
    const timeout = setTimeout(() => {
      if (finished) return
      finished = true
      recognition.stop()
      reject(new Error("Did not hear a response. Try speaking again."))
    }, timeoutMs)

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      const transcript = event.results[0]?.[0]?.transcript?.trim() || ""
      recognition.stop()
      resolve(transcript)
    }

    recognition.onerror = (event) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      recognition.stop()
      reject(new Error(event.error === "not-allowed" ? "Microphone permission denied" : event.error))
    }

    recognition.onend = () => {
      clearTimeout(timeout)
    }

    recognition.start()
  })
}
