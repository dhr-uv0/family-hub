'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  getHours,
  getMinutes,
  differenceInMinutes,
  parseISO,
  isToday,
  setHours,
  setMinutes,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar, List, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Activity, CalendarEvent, FamilyMember, Task } from '@/lib/types'
import { EventDialog } from './EventDialog'

type CalendarView = 'month' | 'week' | 'day'

interface FamilyCalendarProps {
  events: Activity[]
  familyMembers: FamilyMember[]
  mode: 'family' | 'personal'
  calendarEvents?: CalendarEvent[]
  tasks?: Task[]
  onEventSaved?: () => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getMemberColor(
  memberId: string,
  familyMembers: FamilyMember[],
  fallback?: string | null
): string {
  if (fallback) return fallback
  const member = familyMembers.find((m) => m.id === memberId)
  return member?.color ?? '#14b8a6'
}

interface EventChipProps {
  title: string
  color: string
  onClick: () => void
  small?: boolean
}

function EventChip({ title, color, onClick, small }: EventChipProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'w-full text-left truncate font-medium rounded-md px-1.5 py-0.5 transition-opacity hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-white/50',
        small ? 'text-[10px] py-px' : 'text-xs'
      )}
      style={{ backgroundColor: color + '33', color }}
    >
      {title}
    </button>
  )
}

export function FamilyCalendar({
  events,
  familyMembers,
  mode,
  calendarEvents = [],
  tasks = [],
  onEventSaved,
}: FamilyCalendarProps) {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Activity | CalendarEvent | undefined>()
  const [dialogInitialDate, setDialogInitialDate] = useState<Date | undefined>()
  const timeGridRef = useRef<HTMLDivElement>(null)

  // Scroll to current hour in week/day view
  useEffect(() => {
    if ((view === 'week' || view === 'day') && timeGridRef.current) {
      const hour = new Date().getHours()
      const scrollTop = Math.max(0, hour * 64 - 128)
      timeGridRef.current.scrollTop = scrollTop
    }
  }, [view])

  // Combine all events into a unified list
  const allEvents = useMemo(() => {
    const combined: Array<{
      id: string
      title: string
      start: Date
      end: Date | null
      allDay: boolean
      color: string
      source: Activity | CalendarEvent | Task
      type: 'activity' | 'calendar_event' | 'task'
    }> = []

    for (const ev of events) {
      combined.push({
        id: ev.id,
        title: ev.title,
        start: parseISO(ev.start_time),
        end: ev.end_time ? parseISO(ev.end_time) : null,
        allDay: ev.all_day,
        color: getMemberColor(ev.family_member_id, familyMembers, ev.color),
        source: ev,
        type: 'activity',
      })
    }

    for (const ev of calendarEvents) {
      combined.push({
        id: ev.id,
        title: ev.title,
        start: parseISO(ev.start_time),
        end: ev.end_time ? parseISO(ev.end_time) : null,
        allDay: ev.all_day,
        color: ev.color ?? '#6366f1',
        source: ev,
        type: 'calendar_event',
      })
    }

    for (const task of tasks) {
      if (task.due_date) {
        const dueDate = parseISO(task.due_date)
        combined.push({
          id: task.id,
          title: task.title,
          start: dueDate,
          end: null,
          allDay: true,
          color: '#f59e0b',
          source: task,
          type: 'task',
        })
      }
    }

    return combined
  }, [events, calendarEvents, tasks, familyMembers])

  function getEventsForDay(day: Date) {
    return allEvents.filter((ev) => isSameDay(ev.start, day))
  }

  function navigate(direction: 'prev' | 'next') {
    if (view === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
    } else if (view === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
    } else {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1))
    }
  }

  function goToday() {
    setCurrentDate(new Date())
  }

  function openAddDialog(date?: Date) {
    setEditingEvent(undefined)
    setDialogInitialDate(date ?? new Date())
    setDialogOpen(true)
  }

  function openEditDialog(source: Activity | CalendarEvent) {
    setEditingEvent(source)
    setDialogInitialDate(undefined)
    setDialogOpen(true)
  }

  function handleDialogClose(saved?: boolean) {
    setDialogOpen(false)
    setEditingEvent(undefined)
    if (saved && onEventSaved) onEventSaved()
  }

  // Header label
  const headerLabel = useMemo(() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy')
    if (view === 'week') {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy')
  }, [view, currentDate])

  // Month view days
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Week view days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  // Current time position (percentage of day)
  const now = new Date()
  const nowMinutes = getHours(now) * 60 + getMinutes(now)
  const nowTop = (nowMinutes / 1440) * 100

  // Event block position in time grid
  function getEventStyle(start: Date, end: Date | null) {
    const startMin = getHours(start) * 60 + getMinutes(start)
    const endMin = end
      ? getHours(end) * 60 + getMinutes(end)
      : startMin + 60
    const top = (startMin / 1440) * 100
    const height = Math.max(((endMin - startMin) / 1440) * 100, 2)
    return { top: `${top}%`, height: `${height}%` }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('prev')}
            className="h-9 w-9"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('next')}
            className="h-9 w-9"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="text-xs h-9 px-3"
          >
            Today
          </Button>
          <h2 className="text-base font-semibold text-gray-900 ml-1 hidden sm:block">
            {headerLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 h-9 text-xs font-medium transition-colors capitalize',
                  view === v
                    ? 'bg-teal-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button
            size="icon"
            onClick={() => openAddDialog()}
            className="h-9 w-9 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
            aria-label="Add event"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile header label */}
      <div className="px-4 py-1 sm:hidden">
        <p className="text-sm font-medium text-gray-700">{headerLabel}</p>
      </div>

      {/* ── MONTH VIEW ── */}
      {view === 'month' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Day names row */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells grid */}
          <div className="grid grid-cols-7 flex-1 overflow-y-auto">
            {monthDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDay(day)
                    openAddDialog(day)
                  }}
                  className={cn(
                    'min-h-[80px] border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-gray-50 transition-colors',
                    !inMonth && 'bg-gray-50/60',
                    isSelected && 'bg-teal-50'
                  )}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span
                      className={cn(
                        'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                        today
                          ? 'bg-teal-500 text-white'
                          : inMonth
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <EventChip
                        key={ev.id}
                        title={ev.title}
                        color={ev.color}
                        small
                        onClick={() => {
                          if (ev.type !== 'task') {
                            openEditDialog(ev.source as Activity | CalendarEvent)
                          }
                        }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-gray-500 pl-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* All-day row + day headers */}
          <div className="flex border-b border-gray-100">
            <div className="w-14 shrink-0 border-r border-gray-100 py-2 text-center">
              <span className="text-[10px] text-gray-400 uppercase">All day</span>
            </div>
            {weekDays.map((day) => {
              const allDayEvs = allEvents.filter(
                (ev) => ev.allDay && isSameDay(ev.start, day)
              )
              const today = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 border-r border-gray-100 px-1 py-1"
                >
                  <div
                    className={cn(
                      'text-center text-xs font-medium mb-1 cursor-pointer',
                      today ? 'text-teal-500' : 'text-gray-600'
                    )}
                    onClick={() => openAddDialog(day)}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold',
                        today ? 'bg-teal-500 text-white' : ''
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="text-[10px] text-gray-400">{format(day, 'EEE')}</div>
                  </div>
                  <div className="space-y-0.5">
                    {allDayEvs.map((ev) => (
                      <EventChip
                        key={ev.id}
                        title={ev.title}
                        color={ev.color}
                        small
                        onClick={() => {
                          if (ev.type !== 'task') openEditDialog(ev.source as Activity | CalendarEvent)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div ref={timeGridRef} className="flex flex-1 overflow-y-auto relative">
            {/* Hour labels */}
            <div className="w-14 shrink-0 border-r border-gray-100 relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-16 border-b border-gray-50 flex items-start justify-end pr-2 pt-0.5"
                >
                  <span className="text-[10px] text-gray-400">
                    {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex flex-1 relative">
              {weekDays.map((day) => {
                const timedEvs = allEvents.filter(
                  (ev) => !ev.allDay && isSameDay(ev.start, day)
                )
                return (
                  <div
                    key={day.toISOString()}
                    className="flex-1 border-r border-gray-100 relative"
                    onClick={() => openAddDialog(day)}
                  >
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <div key={h} className="h-16 border-b border-gray-50" />
                    ))}

                    {/* Current time indicator */}
                    {isToday(day) && (
                      <div
                        className="absolute left-0 right-0 z-10 pointer-events-none"
                        style={{ top: `${(nowMinutes / (24 * 60)) * (64 * 24)}px` }}
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-px bg-red-400" />
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    {timedEvs.map((ev) => {
                      const startMin = getHours(ev.start) * 60 + getMinutes(ev.start)
                      const endMin = ev.end
                        ? getHours(ev.end) * 60 + getMinutes(ev.end)
                        : startMin + 60
                      const top = (startMin / 60) * 64
                      const height = Math.max(((endMin - startMin) / 60) * 64, 24)
                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (ev.type !== 'task') openEditDialog(ev.source as Activity | CalendarEvent)
                          }}
                          className="absolute left-0.5 right-0.5 rounded-md px-1 py-0.5 text-left overflow-hidden hover:opacity-80 transition-opacity focus:outline-none"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: ev.color + '33',
                            borderLeft: `3px solid ${ev.color}`,
                          }}
                        >
                          <p
                            className="text-[11px] font-medium truncate leading-tight"
                            style={{ color: ev.color }}
                          >
                            {ev.title}
                          </p>
                          {height > 30 && (
                            <p className="text-[10px] text-gray-500 truncate">
                              {format(ev.start, 'h:mm a')}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {view === 'day' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Date header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-base font-bold',
                isToday(currentDate)
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              )}
            >
              {format(currentDate, 'd')}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {format(currentDate, 'EEEE')}
              </p>
              <p className="text-xs text-gray-500">{format(currentDate, 'MMMM yyyy')}</p>
            </div>
            <Button
              size="sm"
              onClick={() => openAddDialog(currentDate)}
              className="ml-auto bg-teal-500 hover:bg-teal-600 text-white h-9"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {/* All-day events */}
          {allEvents.filter((ev) => ev.allDay && isSameDay(ev.start, currentDate)).length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-1 font-medium">All day</p>
              <div className="space-y-1">
                {allEvents
                  .filter((ev) => ev.allDay && isSameDay(ev.start, currentDate))
                  .map((ev) => (
                    <EventChip
                      key={ev.id}
                      title={ev.title}
                      color={ev.color}
                      onClick={() => {
                        if (ev.type !== 'task') openEditDialog(ev.source as Activity | CalendarEvent)
                      }}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Time grid */}
          <div ref={timeGridRef} className="flex flex-1 overflow-y-auto relative">
            <div className="w-14 shrink-0 border-r border-gray-100">
              {HOURS.map((h) => (
                <div key={h} className="h-16 border-b border-gray-50 flex items-start justify-end pr-2 pt-0.5">
                  <span className="text-[10px] text-gray-400">
                    {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex-1 relative">
              {HOURS.map((h) => (
                <div key={h} className="h-16 border-b border-gray-50" />
              ))}

              {isToday(currentDate) && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: `${(nowMinutes / (24 * 60)) * (64 * 24)}px` }}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-px bg-red-400" />
                  </div>
                </div>
              )}

              {allEvents
                .filter((ev) => !ev.allDay && isSameDay(ev.start, currentDate))
                .map((ev) => {
                  const startMin = getHours(ev.start) * 60 + getMinutes(ev.start)
                  const endMin = ev.end
                    ? getHours(ev.end) * 60 + getMinutes(ev.end)
                    : startMin + 60
                  const top = (startMin / 60) * 64
                  const height = Math.max(((endMin - startMin) / 60) * 64, 28)
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (ev.type !== 'task') openEditDialog(ev.source as Activity | CalendarEvent)
                      }}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden hover:opacity-80 transition-opacity focus:outline-none"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: ev.color + '22',
                        borderLeft: `3px solid ${ev.color}`,
                      }}
                    >
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: ev.color }}
                      >
                        {ev.title}
                      </p>
                      {height > 30 && (
                        <p className="text-[11px] text-gray-500">
                          {format(ev.start, 'h:mm a')}
                          {ev.end && ` – ${format(ev.end, 'h:mm a')}`}
                        </p>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Event Dialog */}
      <EventDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        event={editingEvent}
        familyMembers={familyMembers}
        mode={mode}
        initialDate={dialogInitialDate}
      />
    </div>
  )
}
