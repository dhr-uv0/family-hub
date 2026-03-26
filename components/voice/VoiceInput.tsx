'use client'

import { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Mic, MicOff } from 'lucide-react'
import { useVoiceInput } from '@/lib/hooks/useVoiceInput'

export function VoiceInput() {
  const router = useRouter()
  const pathname = usePathname()
  const isDashboardRoute = pathname?.startsWith('/dashboard')

  const handleVoiceResult = useCallback(
    (text: string) => {
      // "add [item] to shopping list"
      const shoppingMatch = text.match(/add (.+?) to (?:the )?shopping list/)
      if (shoppingMatch) {
        const item = encodeURIComponent(shoppingMatch[1])
        router.push(`/dashboard/shopping?add=${item}`)
        return
      }

      // "add task [title]"
      const taskMatch = text.match(/add task (.+)/)
      if (taskMatch) {
        const title = encodeURIComponent(taskMatch[1])
        router.push(`/dashboard/tasks?new=${title}`)
        return
      }

      // "what's the weather" / "weather"
      if (text.includes("weather")) {
        router.push('/dashboard?widget=weather')
        return
      }

      // "show calendar" / "go to calendar"
      if (text.includes('calendar')) {
        router.push('/dashboard/calendar')
        return
      }

      // "go to [page]"
      const navMatch = text.match(/go to (.+)/)
      if (navMatch) {
        const page = navMatch[1].trim().replace(/\s+/g, '-')
        router.push(`/dashboard/${page}`)
        return
      }
    },
    [router]
  )

  const { isListening, isSupported, transcript, startListening, stopListening } =
    useVoiceInput(handleVoiceResult)

  // Only render on dashboard routes
  if (!isDashboardRoute || !isSupported) return null

  const handleToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2">
      {/* Transcript bubble */}
      {transcript && (
        <div className="animate-fade-in max-w-[200px] rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-lg border border-gray-100">
          {transcript}
        </div>
      )}

      {/* Microphone button */}
      <button
        onClick={handleToggle}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        className={`
          relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg
          transition-all duration-200 focus:outline-none focus-visible:ring-2
          focus-visible:ring-teal-500 focus-visible:ring-offset-2
          ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-teal-500 hover:bg-teal-600 text-white'
          }
        `}
      >
        {/* Animated rings when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
            <span className="absolute inset-[-6px] rounded-full border-2 border-red-300 animate-ping opacity-30" />
          </>
        )}
        {isListening ? (
          <MicOff className="h-6 w-6 relative z-10" />
        ) : (
          <Mic className="h-6 w-6 relative z-10" />
        )}
      </button>
    </div>
  )
}
