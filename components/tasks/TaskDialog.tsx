'use client'

import React, { useState, useEffect, useRef } from 'react'
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
import { cn, PRIORITY_COLORS, CATEGORY_ICONS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Task, FamilyMember, TaskPriority, TaskStatus, TaskCategory } from '@/lib/types'
import { Trash2, Loader2, X, Plus } from 'lucide-react'

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'school', label: 'School' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
]

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

interface TaskDialogProps {
  open: boolean
  onClose: (saved?: boolean) => void
  task?: Task
  familyMembers: FamilyMember[]
  isAdmin?: boolean
  defaultDueDate?: string
}

export function TaskDialog({
  open,
  onClose,
  task,
  familyMembers,
  isAdmin = false,
  defaultDueDate,
}: TaskDialogProps) {
  const supabase = createClient()
  const tagInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [category, setCategory] = useState<TaskCategory>('personal')
  const [isFamilyTask, setIsFamilyTask] = useState(false)
  const [assignedTo, setAssignedTo] = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isEditing = !!task

  useEffect(() => {
    if (!open) return
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setDueDate(task.due_date ?? '')
      setDueTime(task.due_time ?? '')
      setPriority(task.priority)
      setStatus(task.status)
      setCategory(task.category)
      setIsFamilyTask(task.is_family_task)
      setAssignedTo(task.assigned_to ?? '')
      setRecurrence(task.recurrence_pattern ?? 'none')
      setTags(task.tags ?? [])
      setEstimatedMinutes(task.estimated_minutes?.toString() ?? '')
      setErrors({})
    } else {
      setTitle('')
      setDescription('')
      setDueDate(defaultDueDate ?? '')
      setDueTime('')
      setPriority('medium')
      setStatus('todo')
      setCategory('personal')
      setIsFamilyTask(false)
      setAssignedTo('')
      setRecurrence('none')
      setTags([])
      setTagInput('')
      setEstimatedMinutes('')
      setErrors({})
    }
  }, [open, task, defaultDueDate])

  function validate() {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Title is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function addTag() {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const payload: Partial<Task> = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        due_time: dueTime || null,
        priority,
        status,
        category,
        is_family_task: isFamilyTask,
        assigned_to: isFamilyTask && assignedTo ? assignedTo : null,
        recurrence_pattern: recurrence === 'none' ? null : recurrence,
        tags,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        owner_id: user?.id,
      }

      if (status === 'done' && !task?.completed_at) {
        payload.completed_at = new Date().toISOString()
      } else if (status !== 'done') {
        payload.completed_at = null
      }

      if (isEditing && task) {
        await supabase.from('tasks').update(payload).eq('id', task.id)
      } else {
        await supabase.from('tasks').insert(payload)
      }

      onClose(true)
    } catch (err) {
      console.error('Error saving task:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      await supabase.from('tasks').delete().eq('id', task.id)
      onClose(true)
    } catch (err) {
      console.error('Error deleting task:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Task' : 'New Task'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className={cn(
                'h-11 rounded-lg border-gray-200',
                errors.title && 'border-red-400 focus-visible:ring-red-400'
              )}
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
              rows={2}
              className="rounded-lg border-gray-200 resize-none"
            />
          </div>

          {/* Due date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="due-date" className="text-sm font-medium text-gray-700">
                Due date
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 rounded-lg border-gray-200 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-time" className="text-sm font-medium text-gray-700">
                Due time
              </Label>
              <Input
                id="due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="h-11 rounded-lg border-gray-200 text-sm"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Priority</Label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-9 rounded-lg border text-sm font-medium transition-colors',
                    priority === p.value
                      ? 'border-transparent text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  )}
                  style={
                    priority === p.value
                      ? { backgroundColor: PRIORITY_COLORS[p.value] }
                      : {}
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PRIORITY_COLORS[p.value] }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[c.value]}</span>
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Family task toggle (admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <Switch
                id="family-task"
                checked={isFamilyTask}
                onCheckedChange={setIsFamilyTask}
                className="data-[state=checked]:bg-teal-500"
              />
              <Label htmlFor="family-task" className="text-sm font-medium text-gray-700 cursor-pointer">
                Family task
              </Label>
            </div>
          )}

          {/* Assigned to */}
          {isFamilyTask && familyMembers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Assign to</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-11 rounded-lg border-gray-200">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {familyMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
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

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Tags</Label>
            <div className="flex flex-wrap gap-1.5 p-2 min-h-[44px] border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-teal-100 text-teal-700 text-xs font-medium px-2 py-0.5 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-teal-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Type and press Enter to add tags' : ''}
                className="flex-1 min-w-[100px] text-sm outline-none bg-transparent placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Estimated minutes */}
          <div className="space-y-1.5">
            <Label htmlFor="est-min" className="text-sm font-medium text-gray-700">
              Estimated time (minutes)
            </Label>
            <Input
              id="est-min"
              type="number"
              min="1"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="e.g. 30"
              className="h-11 rounded-lg border-gray-200"
            />
          </div>

          {/* Recurrence */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Repeat</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((r) => (
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
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
            {saving ? 'Saving…' : isEditing ? 'Update Task' : 'Add Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
