'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Activity, CalendarEvent, FamilyMember } from '@/lib/types'
import { Trash2, Loader2 } from 'lucide-react'

const EVENT_COLORS = [
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f97316', // orange
  '#84cc16', // lime
]

const CATEGORIES = [
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'school', label: 'School' },
  { value: 'health', label: 'Health' },
  { value: 'social', label: 'Social' },
  { value: 'sports', label: 'Sports' },
  { value: 'family', label: 'Family' },
  { value: 'other', label: 'Other' },
]

const RECURRING_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const REMINDER_OPTIONS = [
  { value: '', label: 'No reminder' },
  { value: '5', label: '5 minutes before' },
  { value: '10', label: '10 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: '1 day before' },
]

interface EventDialogProps {
  open: boolean
  onClose: (saved?: boolean) => void
  event?: Activity | CalendarEvent
  familyMembers: FamilyMember[]
  mode: 'family' | 'personal'
  initialDate?: Date
}

function isActivity(ev: Activity | CalendarEvent): ev is Activity {
  return 'family_member_id' in ev
}

export function EventDialog({
  open,
  onClose,
  event,
  familyMembers,
  mode,
  initialDate,
}: EventDialogProps) {
  const supabase = createClient()

  const defaultDate = initialDate ?? new Date()
  const defaultStart = format(defaultDate, "yyyy-MM-dd'T'HH:mm")
  const defaultEnd = format(
    new Date(defaultDate.getTime() + 60 * 60 * 1000),
    "yyyy-MM-dd'T'HH:mm"
  )

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDateTime, setStartDateTime] = useState(defaultStart)
  const [endDateTime, setEndDateTime] = useState(defaultEnd)
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('personal')
  const [color, setColor] = useState(EVENT_COLORS[0])
  const [familyMemberId, setFamilyMemberId] = useState(familyMembers[0]?.id ?? '')
  const [recurringPattern, setRecurringPattern] = useState('none')
  const [reminder, setReminder] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isEditing = !!event

  useEffect(() => {
    if (!open) return
    if (event) {
      setTitle(event.title)
      setDescription(event.description ?? '')
      setAllDay(event.all_day)
      setColor(event.color ?? EVENT_COLORS[0])
      setCategory((isActivity(event) ? event.category : undefined) ?? 'personal')
      setRecurringPattern(
        (isActivity(event) ? event.recurring_pattern : event.recurrence_pattern) ?? 'none'
      )
      setReminder(
        isActivity(event) ? String(event.reminder_minutes ?? '') : ''
      )
      if (isActivity(event)) {
        setStartDateTime(
          event.start_time
            ? format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm")
            : defaultStart
        )
        setEndDateTime(
          event.end_time
            ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm")
            : defaultEnd
        )
        setLocation(event.location ?? '')
        setFamilyMemberId(event.family_member_id)
      } else {
        setStartDateTime(
          event.start_time
            ? format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm")
            : defaultStart
        )
        setEndDateTime(
          event.end_time
            ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm")
            : defaultEnd
        )
        setLocation('')
      }
    } else {
      setTitle('')
      setDescription('')
      setStartDateTime(defaultStart)
      setEndDateTime(defaultEnd)
      setAllDay(false)
      setLocation('')
      setCategory('personal')
      setColor(EVENT_COLORS[0])
      setFamilyMemberId(familyMembers[0]?.id ?? '')
      setRecurringPattern('none')
      setReminder('')
      setErrors({})
    }
  }, [open, event]) // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (!startDateTime) errs.startDateTime = 'Start date/time is required'
    if (!allDay && endDateTime && endDateTime < startDateTime) {
      errs.endDateTime = 'End must be after start'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      if (mode === 'family') {
        const payload: Partial<Activity> = {
          title: title.trim(),
          description: description.trim() || null,
          start_time: allDay
            ? new Date(startDateTime).toISOString()
            : new Date(startDateTime).toISOString(),
          end_time: endDateTime ? new Date(endDateTime).toISOString() : null,
          all_day: allDay,
          location: location.trim() || null,
          category,
          color,
          family_member_id: familyMemberId,
          recurring_pattern: recurringPattern === 'none' ? null : recurringPattern,
          reminder_minutes: reminder ? parseInt(reminder) : null,
        }
        if (isEditing && event) {
          await supabase.from('activities').update(payload).eq('id', event.id)
        } else {
          await supabase.from('activities').insert(payload)
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const payload: Partial<CalendarEvent> = {
          title: title.trim(),
          description: description.trim() || null,
          start_time: new Date(startDateTime).toISOString(),
          end_time: endDateTime ? new Date(endDateTime).toISOString() : null,
          all_day: allDay,
          color,
          event_type: 'family',
          is_family_event: false,
          visibility: 'private',
          recurrence_pattern: recurringPattern === 'none' ? null : recurringPattern,
          owner_id: user?.id,
        }
        if (isEditing && event) {
          await supabase.from('calendar_events').update(payload).eq('id', event.id)
        } else {
          await supabase.from('calendar_events').insert(payload)
        }
      }
      onClose(true)
    } catch (err) {
      console.error('Error saving event:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!event) return
    setDeleting(true)
    try {
      if (mode === 'family') {
        await supabase.from('activities').delete().eq('id', event.id)
      } else {
        await supabase.from('calendar_events').delete().eq('id', event.id)
      }
      onClose(true)
    } catch (err) {
      console.error('Error deleting event:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Event' : 'Add Event'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className={cn(
                'h-11 rounded-lg border-gray-200',
                errors.title && 'border-red-400 focus-visible:ring-red-400'
              )}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="event-desc" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="rounded-lg border-gray-200 resize-none"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="all-day"
              checked={allDay}
              onCheckedChange={setAllDay}
              className="data-[state=checked]:bg-teal-500"
            />
            <Label htmlFor="all-day" className="text-sm font-medium text-gray-700 cursor-pointer">
              All day
            </Label>
          </div>

          {/* Start / End date-time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-dt" className="text-sm font-medium text-gray-700">
                Start <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start-dt"
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? startDateTime.slice(0, 10) : startDateTime}
                onChange={(e) =>
                  setStartDateTime(
                    allDay ? e.target.value + 'T00:00' : e.target.value
                  )
                }
                className={cn(
                  'h-11 rounded-lg border-gray-200 text-sm',
                  errors.startDateTime && 'border-red-400'
                )}
              />
              {errors.startDateTime && (
                <p className="text-xs text-red-500">{errors.startDateTime}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-dt" className="text-sm font-medium text-gray-700">
                End
              </Label>
              <Input
                id="end-dt"
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? endDateTime.slice(0, 10) : endDateTime}
                onChange={(e) =>
                  setEndDateTime(
                    allDay ? e.target.value + 'T23:59' : e.target.value
                  )
                }
                className={cn(
                  'h-11 rounded-lg border-gray-200 text-sm',
                  errors.endDateTime && 'border-red-400'
                )}
              />
              {errors.endDateTime && (
                <p className="text-xs text-red-500">{errors.endDateTime}</p>
              )}
            </div>
          </div>

          {/* Location (family mode) */}
          {mode === 'family' && (
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Optional location"
                className="h-11 rounded-lg border-gray-200"
              />
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Color</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1',
                    color === c && 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Family member select (family mode) */}
          {mode === 'family' && familyMembers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Family Member</Label>
              <Select value={familyMemberId} onValueChange={setFamilyMemberId}>
                <SelectTrigger className="h-11 rounded-lg border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recurring pattern */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Repeat</Label>
            <Select value={recurringPattern} onValueChange={setRecurringPattern}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRING_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reminder */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Reminder</Label>
            <Select value={reminder} onValueChange={setReminder}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200">
                <SelectValue placeholder="No reminder" />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
          {isEditing && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="sm:mr-auto"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onClose()} disabled={saving || deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || deleting}
            className="bg-teal-500 hover:bg-teal-600 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving…' : isEditing ? 'Update Event' : 'Add Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
