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
  abort?: () => void
}

let activeRecognition: SpeechRecognitionInstance | null = null

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

/** Stop an in-progress speech recognition session (e.g. when user ends the call). */
export function stopListening() {
  if (!activeRecognition) return
  try {
    activeRecognition.abort?.()
  } catch {
    // ignore
  }
  try {
    activeRecognition.stop()
  } catch {
    // ignore
  }
  activeRecognition = null
}

export function listenOnce(timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const recognition = getSpeechRecognition()
    if (!recognition) {
      reject(new Error("Speech recognition is not supported in this browser. Use Chrome."))
      return
    }

    const instance = recognition
    activeRecognition = instance
    let finished = false

    function finish(result: { ok: true; value: string } | { ok: false; error: Error }) {
      if (finished) return
      finished = true
      if (activeRecognition === instance) activeRecognition = null
      clearTimeout(timeout)
      try {
        instance.stop()
      } catch {
        // already stopped
      }
      if (result.ok) resolve(result.value)
      else reject(result.error)
    }

    const timeout = setTimeout(() => {
      finish({ ok: false, error: new Error("Did not hear a response. Try speaking again.") })
    }, timeoutMs)

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || ""
      finish({ ok: true, value: transcript })
    }

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        finish({ ok: true, value: "" })
        return
      }
      finish({
        ok: false,
        error: new Error(
          event.error === "not-allowed" ? "Microphone permission denied" : event.error,
        ),
      })
    }

    recognition.onend = () => {
      // Chrome often ends without onresult/onerror — must not leave the promise hanging.
      if (!finished) {
        finish({ ok: true, value: "" })
      }
    }

    try {
      recognition.start()
    } catch (error) {
      finish({
        ok: false,
        error: error instanceof Error ? error : new Error("Could not start speech recognition"),
      })
    }
  })
}
