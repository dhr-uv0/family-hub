'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Activity, FamilyMember } from '@/lib/types'
import { FamilyCalendar } from '@/components/calendar/FamilyCalendar'
import { EventDialog } from '@/components/calendar/EventDialog'
import { Plus, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CalendarPage() {
  const supabase = createClient()

  const [activities, setActivities] = useState<Activity[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fabOpen, setFabOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    try {
      const [activitiesRes, membersRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*')
          .order('start_time', { ascending: true }),
        supabase
          .from('family_members')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ])

      if (activitiesRes.error) throw activitiesRes.error
      if (membersRes.error) throw membersRes.error

      setActivities(activitiesRes.data ?? [])
      setFamilyMembers(membersRes.data ?? [])
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setError('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()

    // Real-time subscription to activities
    const channel = supabase
      .channel('calendar-activities')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm">Loading calendar…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-3">
          <p className="text-red-500 font-medium">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Family Calendar</h1>
            <p className="text-xs text-gray-500">All family events and activities</p>
          </div>
        </div>
      </div>

      {/* Family member legend */}
      {familyMembers.length > 0 && (
        <div className="flex flex-wrap gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
          {familyMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: member.color }}
              />
              <span className="text-xs font-medium text-gray-700">
                {member.nickname ?? member.name}
              </span>
              <span className="text-[10px] text-gray-400">
                (
                {
                  activities.filter(
                    (a) => a.family_member_id === member.id
                  ).length
                }
                )
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="flex-1 min-h-0">
        <FamilyCalendar
          events={activities}
          familyMembers={familyMembers}
          mode="family"
          onEventSaved={fetchData}
        />
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 md:hidden z-40">
        <Button
          size="icon"
          onClick={() => setFabOpen(true)}
          className="w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/30"
          aria-label="Add event"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* FAB dialog */}
      <EventDialog
        open={fabOpen}
        onClose={(saved) => {
          setFabOpen(false)
          if (saved) fetchData()
        }}
        familyMembers={familyMembers}
        mode="family"
      />
    </div>
  )
}
