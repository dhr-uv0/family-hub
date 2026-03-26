'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FamilyMember } from '@/lib/types'
import { useRealtimeSubscription } from './useRealtimeSubscription'

interface UseFamilyMembersReturn {
  members: FamilyMember[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFamilyMembers(): UseFamilyMembersReturn {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('family_members')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setMembers(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch family members')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Real-time subscription — refetch whenever family_members table changes
  useRealtimeSubscription('family_members', fetchMembers)

  return { members, loading, error, refetch: fetchMembers }
}
