'use client'
import { useState, useEffect, useCallback } from 'react'

export function useVoiceInput(onResult: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    setIsSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      const text = result[0].transcript
      setTranscript(text)
      if (result.isFinal) {
        onResult(text.toLowerCase())
        setTranscript('')
      }
    }
    recognition.start()
  }, [onResult])

  const stopListening = useCallback(() => {
    setIsListening(false)
  }, [])

  return { isListening, isSupported, transcript, startListening, stopListening }
}
