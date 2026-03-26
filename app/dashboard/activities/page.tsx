'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { Activity, FamilyMember } from '@/lib/types'
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
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  RefreshCw,
  Pencil,
  Trash2,
  Car,
  ChevronRight,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'sports', label: 'Sports', icon: '⚽' },
  { key: 'school', label: 'School', icon: '📚' },
  { key: 'music', label: 'Music', icon: '🎵' },
  { key: 'medical', label: 'Medical', icon: '🏥' },
  { key: 'other', label: 'Other', icon: '📌' },
]

interface ActivityForm {
  title: string
  description: string
  family_member_id: string
  location: string
  start_time: string
  end_time: string
  all_day: boolean
  category: string
  recurring_pattern: string
  recurring_end_date: string
  color: string
  reminder_minutes: string
  transportation_notes: string
}

const emptyForm: ActivityForm = {
  title: '',
  description: '',
  family_member_id: '',
  location: '',
  start_time: '',
  end_time: '',
  all_day: false,
  category: 'other',
  recurring_pattern: '',
  recurring_end_date: '',
  color: '#14b8a6',
  reminder_minutes: '',
  transportation_notes: '',
}

const RECURRING_PATTERNS = [
  { value: '', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [filterMember, setFilterMember] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [form, setForm] = useState<ActivityForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const [{ data: activitiesData, error: actErr }, { data: membersData, error: membersErr }] =
        await Promise.all([
          supabase.from('activities').select('*').order('start_time', { ascending: true }),
          supabase.from('family_members').select('*').eq('is_active', true).order('sort_order'),
        ])

      if (actErr) throw actErr
      if (membersErr) throw membersErr

      setActivities(activitiesData ?? [])
      setFamilyMembers(membersData ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useRealtimeSubscription('activities', fetchData)

  const getMember = (id: string) => familyMembers.find(m => m.id === id)

  const openAdd = () => {
    setEditingActivity(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity)
    setForm({
      title: activity.title,
      description: activity.description ?? '',
      family_member_id: activity.family_member_id,
      location: activity.location ?? '',
      start_time: activity.start_time ? activity.start_time.slice(0, 16) : '',
      end_time: activity.end_time ? activity.end_time.slice(0, 16) : '',
      all_day: activity.all_day,
      category: activity.category ?? 'other',
      recurring_pattern: activity.recurring_pattern ?? '',
      recurring_end_date: activity.recurring_end_date ?? '',
      color: activity.color ?? '#14b8a6',
      reminder_minutes: activity.reminder_minutes ? String(activity.reminder_minutes) : '',
      transportation_notes: '',
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.family_member_id || !form.start_time) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      family_member_id: form.family_member_id,
      location: form.location.trim() || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      all_day: form.all_day,
      category: form.category,
      recurring_pattern: form.recurring_pattern || null,
      recurring_end_date: form.recurring_end_date || null,
      color: form.color || null,
      reminder_minutes: form.reminder_minutes ? parseInt(form.reminder_minutes) : null,
    }

    try {
      if (editingActivity) {
        const { error } = await supabase.from('activities').update(payload).eq('id', editingActivity.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('activities').insert(payload)
        if (error) throw error
      }
      setDialogOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activity?')) return
    const supabase = createClient()
    await supabase.from('activities').delete().eq('id', id)
    fetchData()
  }

  const filtered = activities.filter(a => {
    const matchCategory = activeCategory === 'all' || a.category === activeCategory
    const matchMember = filterMember === 'all' || a.family_member_id === filterMember
    return matchCategory && matchMember
  })

  const upcoming = filtered.filter(a => new Date(a.start_time) >= new Date())
  const past = filtered.filter(a => new Date(a.start_time) < new Date())

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
            <p className="text-sm text-gray-500">{activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-teal-500 hover:bg-teal-600 text-white min-h-[44px] gap-2">
          <Plus className="w-4 h-4" /> Add Activity
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors min-h-[40px]',
                activeCategory === cat.key
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
              )}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Member filter */}
        {familyMembers.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setFilterMember('all')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors',
                filterMember === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              All Members
            </button>
            {familyMembers.map(member => (
              <button
                key={member.id}
                onClick={() => setFilterMember(member.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors',
                  filterMember === member.id
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                )}
                style={filterMember === member.id ? { backgroundColor: member.color, borderColor: member.color } : {}}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                {member.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No activities found</p>
          <p className="text-gray-400 text-sm mt-1">
            {activeCategory !== 'all' || filterMember !== 'all'
              ? 'Try changing your filters'
              : 'Add your first family activity'}
          </p>
          {activeCategory === 'all' && filterMember === 'all' && (
            <Button onClick={openAdd} className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </Button>
          )}
        </div>
      )}

      {/* Upcoming activities */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming</h2>
          {upcoming.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              member={getMember(activity.family_member_id)}
              onEdit={() => openEdit(activity)}
              onDelete={() => handleDelete(activity.id)}
            />
          ))}
        </div>
      )}

      {/* Past activities */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Past</h2>
          {past.slice(0, 10).map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              member={getMember(activity.family_member_id)}
              onEdit={() => openEdit(activity)}
              onDelete={() => handleDelete(activity.id)}
              isPast
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="act-title">Title *</Label>
              <Input
                id="act-title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Soccer practice"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Family Member *</Label>
              <Select value={form.family_member_id} onValueChange={v => setForm(p => ({ ...p, family_member_id: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                    <SelectItem key={c.key} value={c.key}>
                      <span className="flex items-center gap-2">{c.icon} {c.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <Label>All Day</Label>
              <Switch checked={form.all_day} onCheckedChange={v => setForm(p => ({ ...p, all_day: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="act-start">Start {form.all_day ? 'Date' : 'Time'} *</Label>
                <Input
                  id="act-start"
                  type={form.all_day ? 'date' : 'datetime-local'}
                  value={form.start_time}
                  onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="act-end">End {form.all_day ? 'Date' : 'Time'}</Label>
                <Input
                  id="act-end"
                  type={form.all_day ? 'date' : 'datetime-local'}
                  value={form.end_time}
                  onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="act-location">Location</Label>
              <Input
                id="act-location"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="e.g. City Sports Center"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="act-desc">Description</Label>
              <Textarea
                id="act-desc"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional notes..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="act-transport">Transportation Notes</Label>
              <Input
                id="act-transport"
                value={form.transportation_notes}
                onChange={e => setForm(p => ({ ...p, transportation_notes: e.target.value }))}
                placeholder="e.g. Carpool with Smith family"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recurring</Label>
                <Select value={form.recurring_pattern} onValueChange={v => setForm(p => ({ ...p, recurring_pattern: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRING_PATTERNS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="act-reminder">Reminder (min)</Label>
                <Input
                  id="act-reminder"
                  type="number"
                  min="0"
                  value={form.reminder_minutes}
                  onChange={e => setForm(p => ({ ...p, reminder_minutes: e.target.value }))}
                  placeholder="15"
                  className="mt-1"
                />
              </div>
            </div>

            {form.recurring_pattern && (
              <div>
                <Label htmlFor="act-recur-end">Repeat Until</Label>
                <Input
                  id="act-recur-end"
                  type="date"
                  value={form.recurring_end_date}
                  onChange={e => setForm(p => ({ ...p, recurring_end_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingActivity ? 'Save Changes' : 'Add Activity'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ActivityCardProps {
  activity: Activity
  member?: FamilyMember
  onEdit: () => void
  onDelete: () => void
  isPast?: boolean
}

function ActivityCard({ activity, member, onEdit, onDelete, isPast }: ActivityCardProps) {
  const catConfig = CATEGORIES.find(c => c.key === activity.category) ?? CATEGORIES[CATEGORIES.length - 1]
  const startDate = parseISO(activity.start_time)

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-4 transition-opacity',
      isPast ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-teal-100'
    )}>
      {/* Date block */}
      <div className={cn(
        'shrink-0 w-14 rounded-xl flex flex-col items-center justify-center py-2 text-center',
        isPast ? 'bg-gray-100' : 'bg-teal-50'
      )}>
        <span className={cn('text-xs font-semibold uppercase', isPast ? 'text-gray-400' : 'text-teal-600')}>
          {format(startDate, 'EEE')}
        </span>
        <span className={cn('text-2xl font-bold leading-tight', isPast ? 'text-gray-500' : 'text-teal-700')}>
          {format(startDate, 'd')}
        </span>
        <span className={cn('text-xs', isPast ? 'text-gray-400' : 'text-teal-500')}>
          {format(startDate, 'MMM')}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900">{activity.title}</h3>
              <span className="text-sm">{catConfig.icon}</span>
              {activity.recurring_pattern && (
                <span className="flex items-center gap-0.5 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                  <RefreshCw className="w-2.5 h-2.5" /> {activity.recurring_pattern}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {/* Time */}
              {!activity.all_day && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {format(startDate, 'h:mm a')}
                  {activity.end_time && ` – ${format(parseISO(activity.end_time), 'h:mm a')}`}
                </div>
              )}
              {activity.all_day && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">All day</span>
              )}

              {/* Location */}
              {activity.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[160px]">{activity.location}</span>
                </div>
              )}
            </div>

            {/* Member chip */}
            {member && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: member.color }}>
                {member.name}
              </div>
            )}

            {/* Description */}
            {activity.description && (
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{activity.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
