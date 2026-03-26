'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import { FamilyMember, LocationStatus, LocationStatusType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MemberWithStatus extends FamilyMember {
  location_status?: LocationStatus | null
}

const STATUS_ICONS: Record<LocationStatusType, string> = {
  home: '🏠',
  away: '🚗',
  'running-late': '⏰',
  school: '📚',
  work: '💼',
}

const STATUS_LABELS: Record<LocationStatusType, string> = {
  home: 'Home',
  away: 'Away',
  'running-late': 'Running Late',
  school: 'School',
  work: 'Work',
}

const STATUS_COLORS: Record<LocationStatusType, string> = {
  home: 'text-emerald-600 bg-emerald-50',
  away: 'text-blue-600 bg-blue-50',
  'running-late': 'text-amber-600 bg-amber-50',
  school: 'text-indigo-600 bg-indigo-50',
  work: 'text-gray-600 bg-gray-100',
}

const ALL_STATUSES: LocationStatusType[] = ['home', 'away', 'running-late', 'school', 'work']

export default function WhoIsHome() {
  const [members, setMembers] = useState<MemberWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)

    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (membersError || !membersData) {
      setLoading(false)
      return
    }

    const { data: statusData } = await supabase
      .from('location_status')
      .select('*')

    const statusMap = new Map<string, LocationStatus>()
    if (statusData) {
      for (const s of statusData) {
        statusMap.set(s.family_member_id, s)
      }
    }

    const combined: MemberWithStatus[] = membersData.map((m) => ({
      ...m,
      location_status: statusMap.get(m.id) ?? null,
    }))

    setMembers(combined)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtimeSubscription('location_status', fetchData)

  const handleStatusUpdate = async (memberId: string, status: LocationStatusType) => {
    setUpdatingId(memberId)
    setExpandedMemberId(null)
    const supabase = createClient()

    // Check if a record exists
    const { data: existing } = await supabase
      .from('location_status')
      .select('id')
      .eq('family_member_id', memberId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('location_status')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('family_member_id', memberId)
    } else {
      await supabase
        .from('location_status')
        .insert({ family_member_id: memberId, status, updated_at: new Date().toISOString() })
    }

    await fetchData()
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="text-3xl mb-2">👨‍👩‍👧‍👦</span>
        <p className="text-sm text-gray-500">No family members yet</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {members.map((member) => {
          const status = member.location_status?.status ?? 'home'
          const isCurrentUser = member.user_id === currentUserId
          const isExpanded = expandedMemberId === member.id
          const isUpdating = updatingId === member.id

          const initial = member.name.charAt(0).toUpperCase()

          return (
            <div key={member.id} className="relative">
              <button
                onClick={() => {
                  if (isCurrentUser) {
                    setExpandedMemberId(isExpanded ? null : member.id)
                  }
                }}
                disabled={isUpdating}
                className={cn(
                  'w-full flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center',
                  isCurrentUser
                    ? 'hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer active:scale-95'
                    : 'cursor-default',
                  isExpanded ? 'border-teal-300 bg-teal-50/50' : 'border-gray-100 bg-white',
                  isUpdating && 'opacity-60'
                )}
                style={{ minHeight: '44px' }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                {/* Name */}
                <span className="text-xs font-medium text-gray-700 truncate w-full">
                  {member.nickname ?? member.name}
                </span>

                {/* Status badge */}
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
                    STATUS_COLORS[status as LocationStatusType]
                  )}
                >
                  <span>{STATUS_ICONS[status as LocationStatusType]}</span>
                  <span>{STATUS_LABELS[status as LocationStatusType]}</span>
                </span>

                {isCurrentUser && (
                  <span className="text-[10px] text-teal-500">tap to update</span>
                )}
              </button>

              {/* Status picker dropdown */}
              {isExpanded && isCurrentUser && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusUpdate(member.id, s)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left',
                        status === s && 'bg-teal-50 text-teal-700 font-medium'
                      )}
                      style={{ minHeight: '44px' }}
                    >
                      <span>{STATUS_ICONS[s]}</span>
                      <span>{STATUS_LABELS[s]}</span>
                      {status === s && <span className="ml-auto text-teal-500">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Overlay to close dropdown */}
      {expandedMemberId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setExpandedMemberId(null)}
        />
      )}
    </div>
  )
}
