'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import { ShoppingList as ShoppingListType, ShoppingItem as ShoppingItemType, FamilyMember } from '@/lib/types'
import ShoppingItem from './ShoppingItem'
import { cn } from '@/lib/utils'

interface ShoppingListProps {
  list: ShoppingListType
  familyMembers: FamilyMember[]
}

interface GroupedItems {
  category: string
  items: ShoppingItemType[]
}

function groupByCategory(items: ShoppingItemType[]): GroupedItems[] {
  const map = new Map<string, ShoppingItemType[]>()

  for (const item of items) {
    const key = item.category ?? 'Uncategorized'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
}

export default function ShoppingList({ list, familyMembers }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [addingItem, setAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('list_id', list.id)
      .order('completed', { ascending: true })
      .order('created_at', { ascending: true })

    if (!error && data) {
      setItems(data as ShoppingItemType[])
    }
    setLoading(false)
  }, [list.id])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useRealtimeSubscription('shopping_items', fetchItems, `list_id=eq.${list.id}`)

  const handleToggle = async (id: string, completed: boolean) => {
    const supabase = createClient()
    const updates: Partial<ShoppingItemType> = {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }
    await supabase.from('shopping_items').update(updates).eq('id', id)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('shopping_items').delete().eq('id', id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleClearCompleted = async () => {
    const supabase = createClient()
    const completedIds = items.filter((i) => i.completed).map((i) => i.id)
    if (completedIds.length === 0) return
    await supabase.from('shopping_items').delete().in('id', completedIds)
    setItems((prev) => prev.filter((item) => !item.completed))
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        list_id: list.id,
        item: newItemName.trim(),
        quantity: newItemQty.trim() || null,
        category: newItemCategory.trim() || null,
        completed: false,
        added_by: user?.id ?? null,
      })
      .select()
      .single()

    if (!error && data) {
      setItems((prev) => [data as ShoppingItemType, ...prev])
      setNewItemName('')
      setNewItemQty('')
      setNewItemCategory('')
      inputRef.current?.focus()
    }
    setSaving(false)
  }

  const toggleAddForm = () => {
    setAddingItem((v) => !v)
    if (!addingItem) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // Sort: uncompleted first, completed last
  const sortedItems = [
    ...items.filter((i) => !i.completed),
    ...items.filter((i) => i.completed),
  ]

  const completedCount = items.filter((i) => i.completed).length
  const totalCount = items.length

  // Group uncompleted by category, keep completed separate
  const uncompletedItems = sortedItems.filter((i) => !i.completed)
  const completedItems = sortedItems.filter((i) => i.completed)
  const groups = groupByCategory(uncompletedItems)

  return (
    <div className="space-y-4">
      {/* Header stats + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {totalCount === 0
              ? 'No items'
              : `${completedCount}/${totalCount} done`}
          </span>
          {totalCount > 0 && (
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="text-xs text-gray-500 hover:text-red-500 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              Clear done ({completedCount})
            </button>
          )}
          <button
            onClick={toggleAddForm}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors',
              addingItem
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-teal-500 hover:bg-teal-600 text-white shadow-sm'
            )}
            style={{ minHeight: '44px' }}
          >
            <span className="text-base leading-none">{addingItem ? '×' : '+'}</span>
            <span>{addingItem ? 'Cancel' : 'Add Item'}</span>
          </button>
        </div>
      </div>

      {/* Add item form */}
      {addingItem && (
        <form
          onSubmit={handleAddItem}
          className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name…"
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400"
              style={{ minHeight: '44px' }}
              required
            />
            <input
              type="text"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              placeholder="Qty"
              className="w-20 text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400"
              style={{ minHeight: '44px' }}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              placeholder="Category (optional)"
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400"
              style={{ minHeight: '44px' }}
            />
            <button
              type="submit"
              disabled={saving || !newItemName.trim()}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              style={{ minHeight: '44px' }}
            >
              {saving ? '…' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Items list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="text-4xl mb-3">🛒</span>
          <p className="text-sm font-medium text-gray-500">List is empty</p>
          <p className="text-xs text-gray-400 mt-1">Tap + Add Item to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grouped uncompleted */}
          {groups.length > 0 && (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.category}>
                  {groups.length > 1 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                      {group.category}
                    </p>
                  )}
                  <div className="space-y-1.5 group">
                    {group.items.map((item) => (
                      <ShoppingItem
                        key={item.id}
                        item={item}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        familyMembers={familyMembers}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed items */}
          {completedItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                Completed ({completedItems.length})
              </p>
              <div className="space-y-1.5 group">
                {completedItems.map((item) => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    familyMembers={familyMembers}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
