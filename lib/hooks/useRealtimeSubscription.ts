'use client'
import { useEffect, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeSubscription(
  table: string,
  callback: () => void,
  filter?: string
) {
  const subscribe = useCallback(() => {
    if (!isSupabaseConfigured()) return () => {}

    const supabase = createClient()
    let channel: RealtimeChannel

    const channelConfig: any = {
      event: '*',
      schema: 'public',
      table,
    }
    if (filter) channelConfig.filter = filter

    channel = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', channelConfig, callback)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, callback, filter])

  useEffect(() => {
    return subscribe()
  }, [subscribe])
}
