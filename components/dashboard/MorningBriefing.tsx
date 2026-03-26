'use client'

import { useState, useEffect } from 'react'
import { X, Sun, Cloud, CalendarDays, ShoppingCart, CheckSquare } from 'lucide-react'

interface BriefingData {
  weather: {
    summary: string
    temperature: number
    unit: string
  } | null
  eventCount: number
  hasConflicts: boolean
  conflictDetails: string | null
  shoppingCount: number
  choresDueCount: number
}

const DISMISSAL_KEY = 'morning-briefing-dismissed'

function isMorningHour(): boolean {
  const hour = new Date().getHours()
  return hour >= 5 && hour < 10
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

async function fetchBriefingData(): Promise<BriefingData> {
  // Fetch data from the app's own API routes in parallel
  const [weatherRes, eventsRes, choresRes, shoppingRes] = await Promise.allSettled([
    fetch('/api/weather').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/events/today').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/chores/today').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/shopping').then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])

  const weather =
    weatherRes.status === 'fulfilled' && weatherRes.value
      ? {
          summary: weatherRes.value.description ?? weatherRes.value.summary ?? 'Clear',
          temperature: weatherRes.value.temperature ?? weatherRes.value.temp ?? '--',
          unit: weatherRes.value.unit ?? '°F',
        }
      : null

  const eventsData =
    eventsRes.status === 'fulfilled' && eventsRes.value ? eventsRes.value : null
  const eventCount: number = eventsData?.count ?? eventsData?.events?.length ?? 0
  const hasConflicts: boolean = eventsData?.hasConflicts ?? false
  const conflictDetails: string | null = eventsData?.conflictDetails ?? null

  const choresData =
    choresRes.status === 'fulfilled' && choresRes.value ? choresRes.value : null
  const choresDueCount: number =
    choresData?.count ?? choresData?.chores?.length ?? 0

  const shoppingData =
    shoppingRes.status === 'fulfilled' && shoppingRes.value ? shoppingRes.value : null
  const shoppingCount: number =
    shoppingData?.count ?? shoppingData?.items?.length ?? 0

  return { weather, eventCount, hasConflicts, conflictDetails, shoppingCount, choresDueCount }
}

export function MorningBriefing() {
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isMorningHour()) return

    // Check if already dismissed today
    try {
      const dismissed = sessionStorage.getItem(DISMISSAL_KEY)
      if (dismissed === getTodayKey()) return
    } catch {
      // sessionStorage may be unavailable; show the briefing
    }

    setVisible(true)

    fetchBriefingData()
      .then((result) => {
        setData(result)
      })
      .catch(() => {
        setData(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISSAL_KEY, getTodayKey())
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 7) return 'Early bird! Good morning'
    if (hour < 9) return 'Good morning'
    return 'Rise and shine'
  })()

  return (
    <div className="animate-fade-in mb-6 overflow-hidden rounded-2xl shadow-md border border-amber-100">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6 text-white drop-shadow" />
          <div>
            <p className="text-sm font-medium text-white/80">Today's Briefing</p>
            <h2 className="text-lg font-bold text-white leading-tight">
              {greeting}, Family!
            </h2>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss morning briefing"
          className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="bg-white px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-amber-400" />
            Loading your morning summary…
          </div>
        ) : (
          <ul className="space-y-3">
            {/* Weather */}
            {data?.weather && (
              <li className="flex items-start gap-3">
                <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">Weather: </span>
                  {data.weather.summary},{' '}
                  {data.weather.temperature}
                  {data.weather.unit}
                </span>
              </li>
            )}

            {/* Events & conflicts */}
            <li className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
              <span className="text-sm text-gray-700">
                {data?.eventCount
                  ? <>
                      <span className="font-medium">{data.eventCount} event{data.eventCount !== 1 ? 's' : ''}</span>{' '}
                      scheduled today
                      {data.hasConflicts && (
                        <span className="ml-1 text-orange-500 font-medium">
                          — schedule conflict{data.conflictDetails ? `: ${data.conflictDetails}` : ' detected'}
                        </span>
                      )}
                    </>
                  : <span className="text-gray-500">No events scheduled today</span>
                }
              </span>
            </li>

            {/* Shopping list */}
            <li className="flex items-start gap-3">
              <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
              <span className="text-sm text-gray-700">
                {data?.shoppingCount
                  ? <>
                      <span className="font-medium">{data.shoppingCount} item{data.shoppingCount !== 1 ? 's' : ''}</span>{' '}
                      on the shopping list
                    </>
                  : <span className="text-gray-500">Shopping list is empty</span>
                }
              </span>
            </li>

            {/* Chores */}
            <li className="flex items-start gap-3">
              <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-sm text-gray-700">
                {data?.choresDueCount
                  ? <>
                      <span className="font-medium">{data.choresDueCount} chore{data.choresDueCount !== 1 ? 's' : ''}</span>{' '}
                      due today
                    </>
                  : <span className="text-gray-500">No chores due today</span>
                }
              </span>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
