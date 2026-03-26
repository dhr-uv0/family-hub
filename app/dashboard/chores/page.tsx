'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { Chore, ChoreCompletion, FamilyMember } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CATEGORIES = ['cleaning', 'cooking', 'laundry', 'outdoor', 'other']
const FREQUENCIES = ['daily', 'weekly', 'specific_days']

interface ChoreForm {
  title: string
  description: string
  assigned_to: string
  frequency: string
  days_of_week: number[]
  category: string
  points: string
}

const emptyForm: ChoreForm = {
  title: '',
  description: '',
  assigned_to: '',
  frequency: 'daily',
  days_of_week: [],
  category: 'other',
  points: '5',
}

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [form, setForm] = useState<ChoreForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDates = DAYS.map((_, i) => addDays(weekStart, i))

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    try {
      const supabase = createClient()
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd')

      const [{ data: choresData, error: choresErr }, { data: completionsData, error: compErr }, { data: membersData, error: membersErr }] =
        await Promise.all([
          supabase.from('chores').select('*').order('created_at', { ascending: true }),
          supabase.from('chore_completions').select('*').gte('completion_date', weekStartStr).lte('completion_date', weekEndStr),
          supabase.from('family_members').select('*').eq('is_active', true).order('sort_order'),
        ])

      if (choresErr) throw choresErr
      if (compErr) throw compErr
      if (membersErr) throw membersErr

      setChores(choresData ?? [])
      setCompletions(completionsData ?? [])
      setFamilyMembers(membersData ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to load chores')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])
  useRealtimeSubscription('chores', fetchData)
  useRealtimeSubscription('chore_completions', fetchData)

  const getCompletion = (choreId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return completions.find(c => c.chore_id === choreId && c.completion_date === dateStr)
  }

  const handleToggle = async (chore: Chore, date: Date) => {
    const key = `${chore.id}-${format(date, 'yyyy-MM-dd')}`
    setTogglingId(key)
    const supabase = createClient()
    const existing = getCompletion(chore.id, date)

    try {
      if (existing) {
        await supabase.from('chore_completions').delete().eq('id', existing.id)
        setCompletions(prev => prev.filter(c => c.id !== existing.id))
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('chore_completions').insert({
          chore_id: chore.id,
          completed_by: chore.assigned_to || user?.id || '',
          completion_date: format(date, 'yyyy-MM-dd'),
        }).select().single()
        if (error) throw error
        if (data) setCompletions(prev => [...prev, data as ChoreCompletion])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTogglingId(null)
    }
  }

  const openAdd = () => {
    setEditingChore(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (chore: Chore) => {
    setEditingChore(chore)
    setForm({
      title: chore.title,
      description: chore.description ?? '',
      assigned_to: chore.assigned_to ?? '',
      frequency: chore.frequency ?? 'daily',
      days_of_week: chore.day_of_week != null ? [chore.day_of_week] : [],
      category: chore.category ?? 'other',
      points: String(chore.points ?? 5),
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to: form.assigned_to || null,
      frequency: form.frequency,
      day_of_week: form.days_of_week.length > 0 ? form.days_of_week[0] : null,
      category: form.category,
      points: parseInt(form.points) || 5,
    }

    try {
      if (editingChore) {
        const { error } = await supabase.from('chores').update(payload).eq('id', editingChore.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('chores').insert(payload)
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
    if (!confirm('Delete this chore?')) return
    const supabase = createClient()
    await supabase.from('chores').delete().eq('id', id)
    fetchData()
  }

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day],
    }))
  }

  // Leaderboard: points per member this week
  const memberPoints: Record<string, number> = {}
  familyMembers.forEach(m => { memberPoints[m.id] = 0 })
  completions.forEach(c => {
    const chore = chores.find(ch => ch.id === c.chore_id)
    if (chore && chore.assigned_to) {
      memberPoints[chore.assigned_to] = (memberPoints[chore.assigned_to] ?? 0) + (chore.points ?? 5)
    }
  })
  const maxPoints = Math.max(...Object.values(memberPoints), 1)
  const sortedMembers = [...familyMembers].sort((a, b) => (memberPoints[b.id] ?? 0) - (memberPoints[a.id] ?? 0))

  const getMember = (id?: string | null) => familyMembers.find(m => m.id === id)

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chore Chart</h1>
            <p className="text-sm text-gray-500">Week of {format(weekStart, 'MMM d')}</p>
          </div>
        </div>
        <Button onClick={openAdd} className="bg-teal-500 hover:bg-teal-600 text-white min-h-[44px] gap-2">
          <Plus className="w-4 h-4" /> Add Chore
        </Button>
      </div>

      {/* Points Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" /> Weekly Leaderboard
        </h2>
        {sortedMembers.length === 0 ? (
          <p className="text-gray-400 text-sm">No family members yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedMembers.map((member, idx) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-8 text-center">
                  {idx === 0 ? (
                    <span className="text-lg">🏆</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                  )}
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    member.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate">{member.name}</span>
                    <span className="text-sm font-bold text-teal-600 ml-2">{memberPoints[member.id] ?? 0} pts</span>
                  </div>
                  <Progress
                    value={((memberPoints[member.id] ?? 0) / maxPoints) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Weekly Grid</h2>
        </div>
        {chores.length === 0 ? (
          <div className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No chores yet</p>
            <p className="text-gray-400 text-sm mt-1">Add chores to track completion</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-48">Chore</th>
                  {DAYS.map((day, i) => {
                    const isToday = isSameDay(weekDates[i], new Date())
                    return (
                      <th
                        key={day}
                        className={cn(
                          'text-center px-2 py-3 text-sm font-semibold w-16',
                          isToday ? 'text-teal-600' : 'text-gray-600'
                        )}
                      >
                        <div>{day}</div>
                        <div className={cn(
                          'text-xs font-normal mt-0.5',
                          isToday ? 'text-teal-500' : 'text-gray-400'
                        )}>
                          {format(weekDates[i], 'd')}
                        </div>
                      </th>
                    )
                  })}
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {chores.map(chore => {
                  const assignedMember = getMember(chore.assigned_to)
                  return (
                    <tr key={chore.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {assignedMember && (
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: assignedMember.color }}
                              title={assignedMember.name}
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800 leading-tight">{chore.title}</p>
                            {assignedMember && (
                              <p className="text-xs text-gray-400">{assignedMember.name}</p>
                            )}
                          </div>
                          {chore.points && (
                            <span className="ml-auto text-xs font-semibold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full">
                              {chore.points}pt
                            </span>
                          )}
                        </div>
                      </td>
                      {weekDates.map((date, i) => {
                        const completion = getCompletion(chore.id, date)
                        const key = `${chore.id}-${format(date, 'yyyy-MM-dd')}`
                        const isToggling = togglingId === key
                        const isToday = isSameDay(date, new Date())
                        return (
                          <td key={i} className={cn('text-center px-2 py-3', isToday && 'bg-teal-50/30')}>
                            <button
                              onClick={() => handleToggle(chore, date)}
                              disabled={isToggling}
                              className="inline-flex items-center justify-center w-11 h-11 rounded-xl transition-all hover:bg-gray-100 active:scale-95"
                              aria-label={completion ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {isToggling ? (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                              ) : completion ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              ) : (
                                <Circle className="w-6 h-6 text-gray-300" />
                              )}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(chore)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(chore.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChore ? 'Edit Chore' : 'Add Chore'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="chore-title">Title *</Label>
              <Input
                id="chore-title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Vacuum living room"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="chore-desc">Description</Label>
              <Textarea
                id="chore-desc"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional details..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm(p => ({ ...p, assigned_to: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {familyMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => (
                      <SelectItem key={f} value={f}>{f.replace('_', ' ')}</SelectItem>
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
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.frequency === 'specific_days' && (
              <div>
                <Label>Days of Week</Label>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                        form.days_of_week.includes(i)
                          ? 'bg-teal-500 text-white border-teal-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="chore-points">Points</Label>
              <Input
                id="chore-points"
                type="number"
                min="1"
                max="100"
                value={form.points}
                onChange={e => setForm(p => ({ ...p, points: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingChore ? 'Save Changes' : 'Add Chore'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
