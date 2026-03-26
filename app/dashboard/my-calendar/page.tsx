'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  format,
  isToday as checkToday,
  isTomorrow as checkTomorrow,
  parseISO,
  isPast,
  isThisWeek,
  startOfDay,
  compareAsc,
} from 'date-fns'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Task, CalendarEvent, FamilyMember } from '@/lib/types'
import { FamilyCalendar } from '@/components/calendar/FamilyCalendar'
import { EventDialog } from '@/components/calendar/EventDialog'
import { TaskDialog } from '@/components/tasks/TaskDialog'
import { TaskItem } from '@/components/tasks/TaskItem'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  List,
  Sun,
  Plus,
  Loader2,
  AlertCircle,
  Clock,
  CalendarDays,
} from 'lucide-react'
import { cn, PRIORITY_COLORS, isOverdue } from '@/lib/utils'

type ViewMode = 'calendar' | 'list' | 'today'

function getListGroup(task: Task): string {
  if (!task.due_date) return 'No Due Date'
  const d = parseISO(task.due_date)
  if (isPast(d) && !checkToday(d) && task.status !== 'done') return 'Overdue'
  if (checkToday(d)) return 'Today'
  if (checkTomorrow(d)) return 'Tomorrow'
  if (isThisWeek(d)) return 'This Week'
  return 'Later'
}

const GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'No Due Date']

export default function MyCalendarPage() {
  const supabase = createClient()

  const [view, setView] = useState<ViewMode>('today')
  const [tasks, setTasks] = useState<Task[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all')

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [tasksRes, eventsRes, membersRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .or(`owner_id.eq.${user.id},is_family_task.eq.true`)
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('owner_id', user.id)
          .order('start_time', { ascending: true }),
        supabase
          .from('family_members')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
      ])

      if (tasksRes.error) throw tasksRes.error
      if (eventsRes.error) throw eventsRes.error
      if (membersRes.error) throw membersRes.error

      setTasks(tasksRes.data ?? [])
      setCalendarEvents(eventsRes.data ?? [])
      setFamilyMembers(membersRes.data ?? [])

      const currentMember = (membersRes.data ?? []).find(
        (m: FamilyMember) => m.user_id === user.id
      )
      setIsAdmin(currentMember?.role === 'admin')
    } catch (err) {
      console.error('Error fetching my calendar data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('my-calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Today's events sorted by start time
  const todayEvents = useMemo(() => {
    return calendarEvents
      .filter((ev) => checkToday(parseISO(ev.start_time)))
      .sort((a, b) => compareAsc(parseISO(a.start_time), parseISO(b.start_time)))
  }, [calendarEvents])

  // Today's tasks sorted by priority
  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  const todayTasks = useMemo(() => {
    return tasks
      .filter(
        (t) =>
          t.due_date &&
          checkToday(parseISO(t.due_date)) &&
          t.status !== 'done'
      )
      .sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
      )
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.due_date && isOverdue(t.due_date) && t.status !== 'done'
    )
  }, [tasks])

  // Filtered tasks for list view
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks
    return tasks.filter((t) => t.status === statusFilter)
  }, [tasks, statusFilter])

  // Grouped tasks for list view
  const taskGroups = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of filteredTasks) {
      const g = getListGroup(t)
      if (!map[g]) map[g] = []
      map[g].push(t)
    }
    return GROUP_ORDER.filter((g) => map[g]?.length > 0).map((g) => ({
      label: g,
      tasks: map[g],
    }))
  }, [filteredTasks])

  async function handleToggleTask(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await supabase
      .from('tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
    fetchData()
  }

  async function handleDeleteTask(task: Task) {
    await supabase.from('tasks').delete().eq('id', task.id)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <p className="text-sm text-gray-500">Loading your calendar…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm">Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shadow-sm">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">My Calendar</h1>
              <span className="text-[10px] font-semibold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Personal
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEventDialogOpen(true)}
            className="h-9 text-xs gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Add event
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditTask(undefined)
              setTaskDialogOpen(true)
            }}
            className="h-9 text-xs gap-1.5 bg-teal-500 hover:bg-teal-600 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white self-start">
        <button
          onClick={() => setView('today')}
          className={cn(
            'flex items-center gap-1.5 px-4 h-10 text-sm font-medium transition-colors',
            view === 'today'
              ? 'bg-teal-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <Sun className="w-4 h-4" />
          Today
        </button>
        <button
          onClick={() => setView('list')}
          className={cn(
            'flex items-center gap-1.5 px-4 h-10 text-sm font-medium transition-colors border-l border-gray-200',
            view === 'list'
              ? 'bg-teal-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <List className="w-4 h-4" />
          List
        </button>
        <button
          onClick={() => setView('calendar')}
          className={cn(
            'flex items-center gap-1.5 px-4 h-10 text-sm font-medium transition-colors border-l border-gray-200',
            view === 'calendar'
              ? 'bg-teal-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <Calendar className="w-4 h-4" />
          Calendar
        </button>
      </div>

      {/* ── TODAY VIEW ── */}
      {view === 'today' && (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Left column: events + tasks */}
          <div className="flex-1 space-y-4">
            {/* Overdue banner */}
            {overdueTasks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-semibold text-red-700">
                    {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'}
                  </p>
                </div>
                <div className="space-y-2">
                  {overdueTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      familyMembers={familyMembers}
                      onToggle={handleToggleTask}
                      onEdit={(t) => { setEditTask(t); setTaskDialogOpen(true) }}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Events Today */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-500" />
                  Events Today
                  {todayEvents.length > 0 && (
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-bold">
                      {todayEvents.length}
                    </span>
                  )}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEventDialogOpen(true)}
                  className="h-8 text-xs text-teal-600 hover:text-teal-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
              {todayEvents.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">No events today</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayEvents.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                      <div
                        className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: ev.color ?? '#14b8a6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                        {!ev.all_day && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(parseISO(ev.start_time), 'h:mm a')}
                            {ev.end_time && ` – ${format(parseISO(ev.end_time), 'h:mm a')}`}
                          </p>
                        )}
                        {ev.all_day && (
                          <p className="text-xs text-gray-400 mt-0.5">All day</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tasks Today */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <List className="w-4 h-4 text-teal-500" />
                  Tasks Today
                  {todayTasks.length > 0 && (
                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-bold">
                      {todayTasks.length}
                    </span>
                  )}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditTask(undefined)
                    setTaskDialogOpen(true)
                  }}
                  className="h-8 text-xs text-teal-600 hover:text-teal-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
              {todayTasks.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">No tasks due today</p>
                  <p className="text-xs text-gray-300 mt-1">Great job staying on top of things!</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {todayTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      familyMembers={familyMembers}
                      onToggle={handleToggleTask}
                      onEdit={(t) => { setEditTask(t); setTaskDialogOpen(true) }}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Status filter pills */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'todo', 'in-progress', 'done'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 h-8 rounded-full text-xs font-medium border transition-colors',
                  statusFilter === s
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                )}
              >
                {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {taskGroups.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No tasks found</p>
            </div>
          ) : (
            taskGroups.map(({ label, tasks: groupTasks }) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wide',
                      label === 'Overdue' ? 'text-red-500' : label === 'Today' ? 'text-teal-600' : 'text-gray-500'
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
                </div>
                <div className="space-y-2">
                  {groupTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      familyMembers={familyMembers}
                      onToggle={handleToggleTask}
                      onEdit={(t) => { setEditTask(t); setTaskDialogOpen(true) }}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          {/* Calendar */}
          <div className="flex-1 min-h-[500px]">
            <FamilyCalendar
              events={[]}
              familyMembers={familyMembers}
              mode="personal"
              calendarEvents={calendarEvents}
              tasks={tasks}
              onEventSaved={fetchData}
            />
          </div>

          {/* Sidebar: tasks for today */}
          <div className="lg:w-72 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-full">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Today's Tasks</h3>
                <p className="text-xs text-gray-500">{format(new Date(), 'MMMM d')}</p>
              </div>
              {todayTasks.length === 0 && overdueTasks.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-400">No tasks for today</p>
                </div>
              ) : (
                <div className="p-3 space-y-2 overflow-y-auto max-h-[500px]">
                  {overdueTasks.slice(0, 3).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      familyMembers={familyMembers}
                      onToggle={handleToggleTask}
                      onEdit={(t) => { setEditTask(t); setTaskDialogOpen(true) }}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                  {todayTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      familyMembers={familyMembers}
                      onToggle={handleToggleTask}
                      onEdit={(t) => { setEditTask(t); setTaskDialogOpen(true) }}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 md:hidden z-40 flex flex-col gap-2 items-end">
        <Button
          size="icon"
          onClick={() => setEventDialogOpen(true)}
          className="w-12 h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg"
          aria-label="Add event"
        >
          <Calendar className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          onClick={() => { setEditTask(undefined); setTaskDialogOpen(true) }}
          className="w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/30"
          aria-label="Add task"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Dialogs */}
      <TaskDialog
        open={taskDialogOpen}
        onClose={(saved) => {
          setTaskDialogOpen(false)
          setEditTask(undefined)
          if (saved) fetchData()
        }}
        task={editTask}
        familyMembers={familyMembers}
        isAdmin={isAdmin}
      />
      <EventDialog
        open={eventDialogOpen}
        onClose={(saved) => {
          setEventDialogOpen(false)
          if (saved) fetchData()
        }}
        familyMembers={familyMembers}
        mode="personal"
      />
    </div>
  )
}
