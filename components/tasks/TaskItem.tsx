'use client'

import React, { useState } from 'react'
import { format, parseISO, isToday as checkToday, isTomorrow } from 'date-fns'
import { ChevronDown, ChevronUp, Clock, User, Tag, Trash2, Edit2 } from 'lucide-react'
import { cn, PRIORITY_COLORS, PRIORITY_LABELS, CATEGORY_ICONS, isOverdue, isToday } from '@/lib/utils'
import type { Task, FamilyMember } from '@/lib/types'

interface TaskItemProps {
  task: Task
  familyMembers: FamilyMember[]
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

function formatDueDate(date: string): string {
  const d = parseISO(date)
  if (checkToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d')
}

export function TaskItem({ task, familyMembers, onToggle, onEdit, onDelete }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = React.useRef<number | null>(null)

  const isDone = task.status === 'done'
  const overdue = task.due_date && !isDone && isOverdue(task.due_date)
  const dueToday = task.due_date && !isDone && isToday(task.due_date)
  const assignedMember = task.assigned_to
    ? familyMembers.find((m) => m.id === task.assigned_to)
    : null

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.touches[0].clientX
    if (delta > 0) {
      setSwipeOffset(Math.min(delta, 80))
    } else {
      setSwipeOffset(0)
    }
  }

  function handleTouchEnd() {
    if (swipeOffset > 60) {
      onDelete(task)
    }
    setSwipeOffset(0)
    touchStartX.current = null
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe-to-delete background */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500 rounded-xl">
        <Trash2 className="w-5 h-5 text-white" />
      </div>

      {/* Main card */}
      <div
        className={cn(
          'relative flex gap-3 rounded-xl p-3 bg-white border transition-all duration-150',
          overdue && 'bg-red-50 border-red-100',
          dueToday && !overdue && 'bg-amber-50 border-amber-100',
          isDone && 'opacity-70',
          'border-l-4'
        )}
        style={{
          borderLeftColor: PRIORITY_COLORS[task.priority],
          transform: `translateX(-${swipeOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task)}
          className={cn(
            'flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500',
            isDone
              ? 'bg-teal-500 border-teal-500'
              : 'border-gray-300 hover:border-teal-400'
          )}
          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
        >
          {isDone && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-medium text-gray-900 truncate',
                  isDone && 'line-through text-gray-400'
                )}
              >
                {task.title}
              </p>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {/* Priority */}
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                >
                  {PRIORITY_LABELS[task.priority]}
                </span>

                {/* Category */}
                <span className="text-[11px] text-gray-500">
                  {CATEGORY_ICONS[task.category]}
                </span>

                {/* Due date */}
                {task.due_date && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                      overdue
                        ? 'bg-red-100 text-red-600'
                        : dueToday
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {overdue ? 'Overdue' : formatDueDate(task.due_date)}
                    {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
                  </span>
                )}

                {/* Status */}
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', STATUS_COLORS[task.status])}>
                  {STATUS_LABELS[task.status]}
                </span>

                {/* Assigned member */}
                {assignedMember && (
                  <span
                    className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: assignedMember.color + '22',
                      color: assignedMember.color,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: assignedMember.color }}
                    />
                    {assignedMember.nickname ?? assignedMember.name}
                  </span>
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-0.5 text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full font-medium"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(task)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors focus:outline-none"
                aria-label="Edit task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {(task.description || (task.tags && task.tags.length > 0) || task.estimated_minutes) && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none"
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
              {task.description && (
                <p className="whitespace-pre-wrap leading-relaxed">{task.description}</p>
              )}
              {task.estimated_minutes && (
                <p className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3" />
                  Estimated: {task.estimated_minutes >= 60
                    ? `${Math.floor(task.estimated_minutes / 60)}h ${task.estimated_minutes % 60 > 0 ? `${task.estimated_minutes % 60}m` : ''}`
                    : `${task.estimated_minutes}m`}
                </p>
              )}
              {task.recurrence_pattern && task.recurrence_pattern !== 'none' && (
                <p className="text-gray-500 capitalize">
                  Repeats: {task.recurrence_pattern}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
