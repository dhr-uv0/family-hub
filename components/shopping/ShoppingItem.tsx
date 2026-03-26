'use client'

import { useState } from 'react'
import { ShoppingItem as ShoppingItemType, FamilyMember } from '@/lib/types'
import { cn, PRIORITY_COLORS } from '@/lib/utils'

interface ShoppingItemProps {
  item: ShoppingItemType
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  familyMembers: FamilyMember[]
}

const CATEGORY_ICONS: Record<string, string> = {
  produce: '🥦',
  dairy: '🥛',
  meat: '🥩',
  bakery: '🍞',
  frozen: '❄️',
  beverages: '🧃',
  snacks: '🍿',
  household: '🧹',
  personal: '🧴',
  pharmacy: '💊',
  other: '📦',
}

export default function ShoppingItem({ item, onToggle, onDelete, familyMembers }: ShoppingItemProps) {
  const [swiped, setSwiped] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const addedByMember = familyMembers.find((m) => m.id === item.added_by)

  const handleToggle = () => {
    onToggle(item.id, !item.completed)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    onDelete(item.id)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (diff > 60) {
      setSwiped(true)
    } else if (diff < -20) {
      setSwiped(false)
    }
    setTouchStartX(null)
  }

  const categoryKey = item.category?.toLowerCase() ?? ''
  const categoryIcon = CATEGORY_ICONS[categoryKey] ?? null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl transition-all',
        isDeleting && 'opacity-0 scale-95 pointer-events-none'
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe-to-delete background */}
      <div className="absolute inset-0 flex items-center justify-end bg-red-500 rounded-xl px-4">
        <span className="text-white text-sm font-medium">Delete</span>
      </div>

      {/* Main content - slides left on swipe */}
      <div
        className={cn(
          'relative flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 transition-transform duration-200',
          swiped ? '-translate-x-20' : 'translate-x-0',
          item.completed ? 'opacity-60' : 'opacity-100'
        )}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={cn(
            'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-0.5',
            item.completed
              ? 'bg-teal-500 border-teal-500'
              : 'border-gray-300 hover:border-teal-400',
          )}
          style={{ minWidth: '24px', minHeight: '24px' }}
          aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            {/* Priority dot */}
            {item.priority && (
              <span
                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{ backgroundColor: PRIORITY_COLORS[item.priority] }}
                title={`${item.priority} priority`}
              />
            )}

            {/* Item name */}
            <span
              className={cn(
                'text-sm font-medium text-gray-800 flex-1',
                item.completed && 'line-through text-gray-400'
              )}
            >
              {item.item}
            </span>

            {/* Quantity */}
            {item.quantity && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {item.quantity}
              </span>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
          )}

          {/* Footer row */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Category badge */}
            {item.category && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">
                {categoryIcon && <span>{categoryIcon}</span>}
                <span className="capitalize">{item.category}</span>
              </span>
            )}

            {/* Added by */}
            {addedByMember && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: addedByMember.color + '20',
                  color: addedByMember.color,
                }}
              >
                {addedByMember.nickname ?? addedByMember.name}
              </span>
            )}
          </div>
        </div>

        {/* Delete button (desktop hover / tap) */}
        <div className="flex items-center">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors"
                style={{ minHeight: '32px' }}
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-1 py-1"
                style={{ minHeight: '32px' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 rounded-lg transition-all hover:bg-red-50"
              aria-label="Delete item"
              style={{ minWidth: '32px', minHeight: '32px' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Swipe delete button (revealed on swipe) */}
      {swiped && (
        <button
          onClick={handleDelete}
          className="absolute right-0 top-0 h-full w-20 bg-red-500 hover:bg-red-600 flex items-center justify-center rounded-r-xl transition-colors"
          aria-label="Delete"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}
