'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { Meal, FamilyMember } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  UtensilsCrossed,
  Clock,
  ShoppingCart,
  Link as LinkIcon,
  Pencil,
  Trash2,
} from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, isSameDay } from 'date-fns'

const MEAL_TYPES: Array<'breakfast' | 'lunch' | 'dinner'> = ['breakfast', 'lunch', 'dinner']
const MEAL_TYPE_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }
const MEAL_TYPE_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }

interface MealForm {
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  title: string
  description: string
  recipe_url: string
  assigned_to: string
  prep_time_minutes: string
  dietary_notes: string
}

const emptyForm = (date: string, mealType: 'breakfast' | 'lunch' | 'dinner'): MealForm => ({
  date,
  meal_type: mealType,
  title: '',
  description: '',
  recipe_url: '',
  assigned_to: '',
  prep_time_minutes: '',
  dietary_notes: '',
})

interface ShoppingAddForm {
  items: string
  list_id: string
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [form, setForm] = useState<MealForm>(emptyForm(format(new Date(), 'yyyy-MM-dd'), 'dinner'))
  const [saving, setSaving] = useState(false)
  const [shoppingDialogOpen, setShoppingDialogOpen] = useState(false)
  const [shoppingMeal, setShoppingMeal] = useState<Meal | null>(null)
  const [shoppingLists, setShoppingLists] = useState<Array<{ id: string; name: string }>>([])
  const [shoppingForm, setShoppingForm] = useState<ShoppingAddForm>({ items: '', list_id: '' })
  const [addingToShopping, setAddingToShopping] = useState(false)

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const start = format(weekStart, 'yyyy-MM-dd')
      const end = format(addDays(weekStart, 6), 'yyyy-MM-dd')

      const [{ data: mealsData, error: mealsErr }, { data: membersData, error: membersErr }, { data: listsData }] =
        await Promise.all([
          supabase.from('meals').select('*').gte('date', start).lte('date', end),
          supabase.from('family_members').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('shopping_lists').select('id, name').order('sort_order'),
        ])

      if (mealsErr) throw mealsErr
      if (membersErr) throw membersErr

      setMeals(mealsData ?? [])
      setFamilyMembers(membersData ?? [])
      if (listsData) {
        setShoppingLists(listsData)
        setShoppingForm(p => ({ ...p, list_id: listsData[0]?.id ?? '' }))
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load meals')
    } finally {
      setLoading(false)
    }
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])
  useRealtimeSubscription('meals', fetchData)

  const getMeal = (date: Date, type: 'breakfast' | 'lunch' | 'dinner') => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meals.find(m => m.date === dateStr && m.meal_type === type)
  }

  const getMember = (id?: string | null) => familyMembers.find(m => m.id === id)

  const openAdd = (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setEditingMeal(null)
    setForm(emptyForm(format(date, 'yyyy-MM-dd'), mealType))
    setDialogOpen(true)
  }

  const openEdit = (meal: Meal) => {
    setEditingMeal(meal)
    setForm({
      date: meal.date,
      meal_type: meal.meal_type,
      title: meal.title,
      description: meal.description ?? '',
      recipe_url: meal.recipe_url ?? '',
      assigned_to: meal.assigned_to ?? '',
      prep_time_minutes: meal.prep_time_minutes ? String(meal.prep_time_minutes) : '',
      dietary_notes: meal.dietary_notes ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      date: form.date,
      meal_type: form.meal_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      recipe_url: form.recipe_url.trim() || null,
      assigned_to: form.assigned_to || null,
      prep_time_minutes: form.prep_time_minutes ? parseInt(form.prep_time_minutes) : null,
      dietary_notes: form.dietary_notes.trim() || null,
    }

    try {
      if (editingMeal) {
        const { error } = await supabase.from('meals').update(payload).eq('id', editingMeal.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('meals').insert(payload)
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
    if (!confirm('Delete this meal?')) return
    const supabase = createClient()
    await supabase.from('meals').delete().eq('id', id)
    fetchData()
  }

  const openShoppingDialog = (meal: Meal) => {
    setShoppingMeal(meal)
    setShoppingForm(p => ({ ...p, items: '' }))
    setShoppingDialogOpen(true)
  }

  const handleAddToShopping = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shoppingForm.items.trim() || !shoppingForm.list_id) return
    setAddingToShopping(true)
    const supabase = createClient()

    const lines = shoppingForm.items.split('\n').map(l => l.trim()).filter(Boolean)
    const inserts = lines.map(item => ({
      list_id: shoppingForm.list_id,
      item,
      notes: `From meal: ${shoppingMeal?.title}`,
      completed: false,
    }))

    try {
      const { error } = await supabase.from('shopping_items').insert(inserts)
      if (error) throw error
      setShoppingDialogOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setAddingToShopping(false)
    }
  }

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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meal Planner</h1>
            <p className="text-sm text-gray-500">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(p => p - 1)}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-4 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset(p => p + 1)}
            className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-gray-100">
              <div className="p-3 border-r border-gray-100" />
              {weekDates.map((date, i) => {
                const isToday = isSameDay(date, new Date())
                return (
                  <div
                    key={i}
                    className={cn(
                      'p-3 text-center border-r border-gray-100 last:border-r-0',
                      isToday && 'bg-teal-50'
                    )}
                  >
                    <div className={cn('text-xs font-semibold uppercase', isToday ? 'text-teal-600' : 'text-gray-500')}>
                      {format(date, 'EEE')}
                    </div>
                    <div className={cn(
                      'text-lg font-bold mt-0.5',
                      isToday ? 'text-teal-700' : 'text-gray-800'
                    )}>
                      {format(date, 'd')}
                    </div>
                    <div className="text-xs text-gray-400">{format(date, 'MMM')}</div>
                  </div>
                )
              })}
            </div>

            {/* Meal rows */}
            {MEAL_TYPES.map(mealType => (
              <div key={mealType} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0">
                <div className="p-3 border-r border-gray-100 flex flex-col items-center justify-center bg-gray-50/50">
                  <span className="text-lg">{MEAL_TYPE_ICONS[mealType]}</span>
                  <span className="text-xs font-semibold text-gray-500 mt-1">{MEAL_TYPE_LABELS[mealType]}</span>
                </div>
                {weekDates.map((date, i) => {
                  const meal = getMeal(date, mealType)
                  const member = getMember(meal?.assigned_to)
                  const isToday = isSameDay(date, new Date())
                  return (
                    <div
                      key={i}
                      className={cn(
                        'border-r border-gray-100 last:border-r-0 min-h-[100px] p-2 flex flex-col',
                        isToday && 'bg-teal-50/20'
                      )}
                    >
                      {meal ? (
                        <div
                          className="flex-1 rounded-xl p-2 cursor-pointer hover:opacity-90 transition-opacity relative group"
                          style={{ backgroundColor: member ? `${member.color}18` : '#f0fdf4', borderLeft: `3px solid ${member?.color ?? '#14b8a6'}` }}
                          onClick={() => openEdit(meal)}
                        >
                          <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{meal.title}</p>
                          {meal.prep_time_minutes && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-2.5 h-2.5 text-gray-400" />
                              <span className="text-xs text-gray-500">{meal.prep_time_minutes}m</span>
                            </div>
                          )}
                          {member && (
                            <div
                              className="w-4 h-4 rounded-full mt-1 flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                            <button
                              onClick={e => { e.stopPropagation(); openShoppingDialog(meal) }}
                              className="w-5 h-5 rounded bg-white/80 flex items-center justify-center hover:bg-white"
                              title="Add to shopping list"
                            >
                              <ShoppingCart className="w-3 h-3 text-gray-600" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(meal.id) }}
                              className="w-5 h-5 rounded bg-white/80 flex items-center justify-center hover:bg-white"
                              title="Delete meal"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openAdd(date, mealType)}
                          className="flex-1 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-teal-300 hover:bg-teal-50/30 transition-colors group"
                        >
                          <Plus className="w-4 h-4 text-gray-300 group-hover:text-teal-400 transition-colors" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Meal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeal ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="meal-date">Date *</Label>
                <Input
                  id="meal-date"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Meal Type</Label>
                <Select value={form.meal_type} onValueChange={v => setForm(p => ({ ...p, meal_type: v as any }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{MEAL_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="meal-title">Title *</Label>
              <Input
                id="meal-title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Spaghetti Bolognese"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="meal-desc">Description</Label>
              <Textarea
                id="meal-desc"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="meal-recipe">Recipe URL</Label>
              <Input
                id="meal-recipe"
                type="url"
                value={form.recipe_url}
                onChange={e => setForm(p => ({ ...p, recipe_url: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned To</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm(p => ({ ...p, assigned_to: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Anyone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anyone">Anyone</SelectItem>
                    {familyMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prep-time">Prep Time (min)</Label>
                <Input
                  id="prep-time"
                  type="number"
                  min="1"
                  value={form.prep_time_minutes}
                  onChange={e => setForm(p => ({ ...p, prep_time_minutes: e.target.value }))}
                  placeholder="30"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dietary">Dietary Notes</Label>
              <Input
                id="dietary"
                value={form.dietary_notes}
                onChange={e => setForm(p => ({ ...p, dietary_notes: e.target.value }))}
                placeholder="e.g. Vegetarian, Nut-free..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingMeal ? 'Save Changes' : 'Add Meal'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shopping List Dialog */}
      <Dialog open={shoppingDialogOpen} onOpenChange={setShoppingDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-teal-500" />
              Add Ingredients
            </DialogTitle>
          </DialogHeader>
          {shoppingMeal && (
            <p className="text-sm text-gray-500">For: <span className="font-medium text-gray-700">{shoppingMeal.title}</span></p>
          )}
          <form onSubmit={handleAddToShopping} className="space-y-4 pt-2">
            <div>
              <Label>Shopping List</Label>
              <Select value={shoppingForm.list_id} onValueChange={v => setShoppingForm(p => ({ ...p, list_id: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select list..." />
                </SelectTrigger>
                <SelectContent>
                  {shoppingLists.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shopping-items">Ingredients (one per line)</Label>
              <Textarea
                id="shopping-items"
                value={shoppingForm.items}
                onChange={e => setShoppingForm(p => ({ ...p, items: e.target.value }))}
                placeholder="Pasta&#10;Ground beef&#10;Tomato sauce"
                rows={5}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShoppingDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={addingToShopping} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                {addingToShopping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Items'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
