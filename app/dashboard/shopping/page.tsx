'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import { ShoppingList as ShoppingListType, FamilyMember } from '@/lib/types'
import ShoppingList from '@/components/shopping/ShoppingList'
import { cn } from '@/lib/utils'

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingListType[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [showNewListDialog, setShowNewListDialog] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListIcon, setNewListIcon] = useState('🛒')
  const [creatingList, setCreatingList] = useState(false)
  const newListInputRef = useRef<HTMLInputElement>(null)

  const fetchLists = useCallback(async () => {
    const supabase = createClient()

    const [{ data: listsData }, { data: membersData }] = await Promise.all([
      supabase
        .from('shopping_lists')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('family_members')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ])

    if (listsData) {
      setLists(listsData as ShoppingListType[])
      // Set active list to first if not set
      setActiveListId((prev) => {
        if (prev && listsData.find((l) => l.id === prev)) return prev
        return listsData[0]?.id ?? null
      })
    }
    if (membersData) {
      setFamilyMembers(membersData as FamilyMember[])
    }
    setLoading(false)
    setIsLive(true)
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  useRealtimeSubscription('shopping_lists', fetchLists)

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return

    setCreatingList(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({
        name: newListName.trim(),
        icon: newListIcon || '🛒',
        sort_order: lists.length,
      })
      .select()
      .single()

    if (!error && data) {
      const newList = data as ShoppingListType
      setLists((prev) => [...prev, newList])
      setActiveListId(newList.id)
      setNewListName('')
      setNewListIcon('🛒')
      setShowNewListDialog(false)
    }
    setCreatingList(false)
  }

  const openNewListDialog = () => {
    setShowNewListDialog(true)
    setTimeout(() => newListInputRef.current?.focus(), 50)
  }

  const activeList = lists.find((l) => l.id === activeListId) ?? null

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Shopping</h1>
          {isLive && (
            <span className="flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={openNewListDialog}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          style={{ minHeight: '44px' }}
        >
          <span>+</span>
          <span>New List</span>
        </button>
      </div>

      {lists.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl mb-4">🛒</span>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">No shopping lists yet</h2>
          <p className="text-sm text-gray-500 mb-6">Create your first list to get started</p>
          <button
            onClick={openNewListDialog}
            className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            Create a List
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => setActiveListId(list.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                  list.id === activeListId
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600'
                )}
                style={{ minHeight: '44px' }}
              >
                {list.icon && <span>{list.icon}</span>}
                <span>{list.name}</span>
              </button>
            ))}
          </div>

          {/* Active list content */}
          {activeList && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                {activeList.icon && <span className="text-xl">{activeList.icon}</span>}
                <h2 className="text-lg font-bold text-gray-900">{activeList.name}</h2>
              </div>
              <ShoppingList list={activeList} familyMembers={familyMembers} />
            </div>
          )}
        </div>
      )}

      {/* New list dialog */}
      {showNewListDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewListDialog(false)
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 z-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New List</h2>

            <form onSubmit={handleCreateList} className="space-y-3">
              {/* Icon picker */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {['🛒', '🏠', '🎉', '🍎', '🧹', '💊', '🛍️', '📦'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewListIcon(emoji)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all border',
                        newListIcon === emoji
                          ? 'bg-teal-50 border-teal-400 scale-110'
                          : 'bg-gray-50 border-gray-200 hover:border-teal-300'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name input */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  List Name
                </label>
                <input
                  ref={newListInputRef}
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Groceries, Pharmacy…"
                  className="w-full text-sm px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400"
                  style={{ minHeight: '44px' }}
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewListDialog(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingList || !newListName.trim()}
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                  style={{ minHeight: '44px' }}
                >
                  {creatingList ? 'Creating…' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
