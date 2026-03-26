'use client'

import React, { useState, useMemo } from 'react'
import {
  isToday as checkToday,
  isTomorrow as checkTomorrow,
  parseISO,
  isThisWeek,
  isPast,
  startOfDay,
} from 'date-fns'
import { Plus, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, PRIORITY_COLORS, CATEGORY_ICONS } from '@/lib/utils'
import type { Task, FamilyMember, TaskPriority, TaskStatus, TaskCategory } from '@/lib/types'
import { TaskItem } from './TaskItem'
import { TaskDialog } from './TaskDialog'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

interface TaskListProps {
  tasks: Task[]
  familyMembers: FamilyMember[]
  onRefresh: () => void
  isAdmin?: boolean
  showFamilyToggle?: boolean
}

type SortKey = 'due_date' | 'priority' | 'created_at'

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function getGroup(task: Task): string {
  if (!task.due_date) return 'No Due Date'
  const d = parseISO(task.due_date)
  const today = startOfDay(new Date())
  if (isPast(d) && !checkToday(d) && task.status !== 'done') return 'Overdue'
  if (checkToday(d)) return 'Today'
  if (checkTomorrow(d)) return 'Tomorrow'
  if (isThisWeek(d)) return 'This Week'
  return 'Later'
}

const GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'No Due Date']

export function TaskList({
  tasks,
  familyMembers,
  onRefresh,
  isAdmin = false,
  showFamilyToggle = false,
}: TaskListProps) {
  const supabase = createClient()

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortKey>('due_date')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [quickTitle, setQuickTitle] = useState('')
  const [quickAdding, setQuickAdding] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Filter
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (memberFilter !== 'all' && t.assigned_to !== memberFilter) return false
      return true
    })
  }, [tasks, statusFilter, priorityFilter, categoryFilter, memberFilter])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      }
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      return b.created_at.localeCompare(a.created_at)
    })
  }, [filtered, sortBy])

  // Group
  const groups = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const task of sorted) {
      const g = getGroup(task)
      if (!map[g]) map[g] = []
      map[g].push(task)
    }
    return GROUP_ORDER.filter((g) => map[g]?.length > 0).map((g) => ({
      label: g,
      tasks: map[g],
    }))
  }, [sorted])

  // Counts for filter badges
  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: tasks.length }
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] ?? 0) + 1
    }
    return counts
  }, [tasks])

  async function handleToggle(task: Task) {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
    onRefresh()
  }

  async function handleDelete(task: Task) {
    await supabase.from('tasks').delete().eq('id', task.id)
    onRefresh()
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setQuickAdding(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      await supabase.from('tasks').insert({
        title: quickTitle.trim(),
        priority: 'medium',
        status: 'todo',
        category: 'personal',
        is_family_task: false,
        tags: [],
        owner_id: user?.id,
      })
      setQuickTitle('')
      onRefresh()
    } finally {
      setQuickAdding(false)
    }
  }

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const hasActiveFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    memberFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Quick add task…"
          className="h-11 rounded-lg border-gray-200 flex-1"
        />
        <Button
          type="submit"
          disabled={!quickTitle.trim() || quickAdding}
          className="h-11 bg-teal-500 hover:bg-teal-600 text-white rounded-lg px-4 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="sr-only">Add</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditTask(undefined)
            setDialogOpen(true)
          }}
          className="h-11 rounded-lg shrink-0"
        >
          Full form
        </Button>
      </form>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'todo', 'in-progress', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors',
              statusFilter === s
                ? 'bg-teal-500 text-white border-teal-500'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            )}
          >
            {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                statusFilter === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              )}
            >
              {countsByStatus[s] ?? 0}
            </span>
          </button>
        ))}

        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn(
            'flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors ml-auto',
            hasActiveFilters
              ? 'border-teal-500 text-teal-600 bg-teal-50'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
          )}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          )}
        </button>
      </div>

      {/* Expanded filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Priority filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Priority</label>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-1.5 capitalize">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                        {p}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Category</label>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TaskCategory | 'all')}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(['work', 'school', 'personal', 'health', 'finance', 'other'] as TaskCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member filter */}
            {familyMembers.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Assigned to</label>
                <Select value={memberFilter} onValueChange={setMemberFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {familyMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nickname ?? m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Sort by</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Due date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="created_at">Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setPriorityFilter('all')
                setCategoryFilter('all')
                setMemberFilter('all')
              }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Task groups */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-gray-500 font-medium">
            {hasActiveFilters ? 'No tasks match your filters' : 'No tasks yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Add your first task using the form above'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ label, tasks: groupTasks }) => {
            const isCollapsed = collapsedGroups.has(label)
            return (
              <div key={label}>
                <button
                  onClick={() => toggleGroup(label)}
                  className="flex items-center gap-2 w-full mb-2 group"
                >
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wide',
                      label === 'Overdue'
                        ? 'text-red-500'
                        : label === 'Today'
                        ? 'text-teal-600'
                        : 'text-gray-500'
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      label === 'Overdue'
                        ? 'bg-red-100 text-red-600'
                        : label === 'Today'
                        ? 'bg-teal-100 text-teal-600'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {groupTasks.length}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                  {isCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="space-y-2">
                    {groupTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        familyMembers={familyMembers}
                        onToggle={handleToggle}
                        onEdit={(t) => {
                          setEditTask(t)
                          setDialogOpen(true)
                        }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Task dialog */}
      <TaskDialog
        open={dialogOpen}
        onClose={(saved) => {
          setDialogOpen(false)
          setEditTask(undefined)
          if (saved) onRefresh()
        }}
        task={editTask}
        familyMembers={familyMembers}
        isAdmin={isAdmin}
      />
    </div>
  )
}
