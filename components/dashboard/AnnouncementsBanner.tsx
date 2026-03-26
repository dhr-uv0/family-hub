'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Announcement } from '@/lib/types'
import { cn } from '@/lib/utils'

const PRIORITY_STYLES: Record<Announcement['priority'], string> = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-purple-100 text-purple-800',
}

const PRIORITY_BORDER: Record<Announcement['priority'], string> = {
  low: 'border-emerald-200',
  medium: 'border-amber-200',
  high: 'border-red-200',
  urgent: 'border-purple-200',
}

const PRIORITY_BG: Record<Announcement['priority'], string> = {
  low: 'bg-emerald-50',
  medium: 'bg-amber-50',
  high: 'bg-red-50',
  urgent: 'bg-purple-50',
}

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAnnouncements = useCallback(async () => {
    const supabase = createClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAnnouncements(data as Announcement[])
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const visible = announcements.filter((a) => !dismissed.has(a.id))

  // Auto-scroll if multiple announcements
  useEffect(() => {
    if (visible.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % visible.length)
    }, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [visible.length])

  // Adjust index if it goes out of bounds after dismiss
  useEffect(() => {
    if (visible.length > 0 && currentIndex >= visible.length) {
      setCurrentIndex(visible.length - 1)
    }
  }, [visible.length, currentIndex])

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]))
  }

  if (visible.length === 0) return null

  const current = visible[currentIndex] ?? visible[0]
  const topPriority = current.priority

  return (
    <div
      className={cn(
        'w-full rounded-xl border px-4 py-3 mb-4 flex items-start gap-3 transition-all',
        PRIORITY_BG[topPriority],
        PRIORITY_BORDER[topPriority]
      )}
    >
      {/* Pin icon for pinned */}
      {current.is_pinned && (
        <span className="text-sm shrink-0 mt-0.5" title="Pinned">📌</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
              PRIORITY_STYLES[current.priority]
            )}
          >
            {current.priority}
          </span>
          <span className="text-sm font-semibold text-gray-800">{current.title}</span>
        </div>
        <p className="text-sm text-gray-700 line-clamp-2">{current.message}</p>

        {/* Dots for multiple */}
        {visible.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2">
            {visible.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  i === currentIndex ? 'bg-gray-600 w-3' : 'bg-gray-300'
                )}
                aria-label={`Go to announcement ${i + 1}`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">
              {currentIndex + 1}/{visible.length}
            </span>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => handleDismiss(current.id)}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10 text-gray-500 hover:text-gray-700 transition-colors text-lg leading-none"
        aria-label="Dismiss announcement"
      >
        ×
      </button>
    </div>
  )
}
