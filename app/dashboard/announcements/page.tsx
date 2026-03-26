'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { Announcement, FamilyMember } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Pin,
  Loader2,
  AlertCircle,
  Bell,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'

const PRIORITIES: Array<Announcement['priority']> = ['low', 'medium', 'high', 'urgent']

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

type ReactionMap = Record<string, Record<string, number>>

interface AnnouncementForm {
  title: string
  message: string
  priority: Announcement['priority']
  expires_at: string
  is_pinned: boolean
}

const emptyForm: AnnouncementForm = {
  title: '',
  message: '',
  priority: 'medium',
  expires_at: '',
  is_pinned: false,
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<AnnouncementForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [reactions, setReactions] = useState<ReactionMap>({})
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      const [{ data: announceData, error: announceErr }, { data: membersData, error: membersErr }, authResult] =
        await Promise.all([
          supabase.from('announcements').select('*').or(`expires_at.is.null,expires_at.gt.${now}`).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('family_members').select('*').eq('is_active', true).order('sort_order'),
          supabase.auth.getUser(),
        ])

      if (announceErr) throw announceErr
      if (membersErr) throw membersErr

      setAnnouncements(announceData ?? [])
      setFamilyMembers(membersData ?? [])

      const user = authResult.data.user
      if (user && membersData) {
        const me = membersData.find((m: FamilyMember) => m.user_id === user.id)
        setIsAdmin(me?.role === 'admin')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useRealtimeSubscription('announcements', fetchData)

  const getMember = (id: string) => familyMembers.find(m => m.id === id)

  const handleReaction = (announcementId: string, emoji: string) => {
    setReactions(prev => {
      const current = prev[announcementId] ?? {}
      const currentCount = current[emoji] ?? 0
      return {
        ...prev,
        [announcementId]: {
          ...current,
          [emoji]: currentCount > 0 ? currentCount - 1 : currentCount + 1,
        },
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) return
    setSaving(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        expires_at: form.expires_at || null,
        is_pinned: form.is_pinned,
        posted_by: user?.id ?? '',
      }
      const { error } = await supabase.from('announcements').insert(payload)
      if (error) throw error
      setDialogOpen(false)
      setForm(emptyForm)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    fetchData()
  }

  const filtered = announcements.filter(a => filterPriority === 'all' || a.priority === filterPriority)
  const pinned = filtered.filter(a => a.is_pinned)
  const regular = filtered.filter(a => !a.is_pinned).sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return (pOrder[a.priority] - pOrder[b.priority]) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchData} variant="outline">Retry</Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-sm text-gray-500">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true) }} className="bg-teal-500 hover:bg-teal-600 text-white min-h-[44px] gap-2">
          <Plus className="w-4 h-4" /> Add Announcement
        </Button>
      </div>

      {/* Priority filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', ...PRIORITIES] as const).map(p => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[36px]',
              filterPriority === p
                ? 'bg-teal-500 text-white border-teal-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-600'
            )}
          >
            {p === 'all' ? 'All' : PRIORITY_CONFIG[p as Announcement['priority']].label}
          </button>
        ))}
      </div>

      {/* No announcements */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No announcements</p>
          <p className="text-gray-400 text-sm mt-1">
            {filterPriority !== 'all' ? 'No announcements with this priority' : 'Post an announcement for your family'}
          </p>
        </div>
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
            <Pin className="w-3.5 h-3.5" /> Pinned
          </div>
          {pinned.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              member={getMember(announcement.posted_by)}
              reactions={reactions[announcement.id] ?? {}}
              onReaction={emoji => handleReaction(announcement.id, emoji)}
              onDelete={isAdmin ? () => handleDelete(announcement.id) : undefined}
              isPinned
            />
          ))}
        </div>
      )}

      {/* Regular announcements */}
      {regular.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Latest</div>
          )}
          {regular.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              member={getMember(announcement.posted_by)}
              reactions={reactions[announcement.id] ?? {}}
              onReaction={emoji => handleReaction(announcement.id, emoji)}
              onDelete={isAdmin ? () => handleDelete(announcement.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="ann-title">Title *</Label>
              <Input
                id="ann-title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Announcement title"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ann-message">Message *</Label>
              <Textarea
                id="ann-message"
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Write your announcement..."
                rows={4}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as any }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expires-at">Expires At</Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-700">Pin Announcement</p>
                <p className="text-xs text-gray-500">Show at top of list</p>
              </div>
              <Switch
                checked={form.is_pinned}
                onCheckedChange={v => setForm(p => ({ ...p, is_pinned: v }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Announcement'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface AnnouncementCardProps {
  announcement: Announcement
  member?: FamilyMember
  reactions: Record<string, number>
  onReaction: (emoji: string) => void
  onDelete?: () => void
  isPinned?: boolean
}

function AnnouncementCard({ announcement, member, reactions, onReaction, onDelete, isPinned }: AnnouncementCardProps) {
  const config = PRIORITY_CONFIG[announcement.priority]
  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-5 space-y-4',
      isPinned ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100'
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {isPinned && (
            <Pin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', config.color)}>
                {config.label}
              </span>
              {isPinned && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                  Pinned
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">{announcement.title}</h3>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message */}
      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{announcement.message}</p>

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {member ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: member.color }}
              >
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                ) : member.name.charAt(0)}
              </div>
              <span className="text-sm text-gray-500">{member.name}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Family Hub</span>
          )}
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
          {announcement.expires_at && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">Expires {format(new Date(announcement.expires_at), 'MMM d')}</span>
            </>
          )}
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-1 flex-wrap">
          {REACTIONS.map(emoji => {
            const count = reactions[emoji] ?? 0
            return (
              <button
                key={emoji}
                onClick={() => onReaction(emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors',
                  count > 0
                    ? 'bg-teal-50 border border-teal-200'
                    : 'hover:bg-gray-100 border border-transparent'
                )}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-xs font-medium text-teal-600">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
