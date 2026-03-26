'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import { Activity, FamilyMember } from '@/lib/types'

interface ActivityWithMember extends Activity {
  family_member?: FamilyMember | null
}

function formatTimeSlot(timeStr: string): string {
  const date = new Date(timeStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function TodaySchedule() {
  const [activities, setActivities] = useState<ActivityWithMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    const supabase = createClient()
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

    const { data, error } = await supabase
      .from('activities')
      .select('*, family_member:family_members(*)')
      .gte('start_time', startOfDay)
      .lt('start_time', endOfDay)
      .order('start_time', { ascending: true })
      .limit(6)

    if (!error && data) {
      setActivities(data as ActivityWithMember[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  useRealtimeSubscription('activities', fetchActivities)

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-4 w-14 bg-gray-200 rounded" />
            <div className="h-4 w-4 bg-gray-200 rounded-full" />
            <div className="h-4 flex-1 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const displayed = activities.slice(0, 5)
  const hasMore = activities.length > 5

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Today</h3>
        <Link
          href="/dashboard/calendar"
          className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
        >
          View calendar →
        </Link>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <span className="text-3xl mb-2">📅</span>
          <p className="text-sm font-medium text-gray-500">No events today</p>
          <p className="text-xs text-gray-400 mt-1">Enjoy your free day!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {displayed.map((activity) => {
            const memberColor = activity.family_member?.color ?? activity.color ?? '#14b8a6'
            return (
              <li
                key={activity.id}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {/* Time */}
                <span className="text-xs font-mono text-gray-500 w-16 shrink-0 pt-0.5">
                  {formatTimeSlot(activity.start_time)}
                </span>
                {/* Color dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: memberColor }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{activity.title}</p>
                  {activity.location && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">📍 {activity.location}</p>
                  )}
                  {activity.family_member && (
                    <p className="text-xs mt-0.5" style={{ color: memberColor }}>
                      {activity.family_member.name}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {hasMore && (
        <Link
          href="/dashboard/calendar"
          className="block text-center text-xs text-teal-600 hover:text-teal-700 font-medium mt-3 py-1 transition-colors"
        >
          +{activities.length - 5} more events — View all
        </Link>
      )}
    </div>
  )
}
