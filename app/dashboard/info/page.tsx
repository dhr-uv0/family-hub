'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ImportantInfo } from '@/lib/types'
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
  Loader2,
  AlertCircle,
  Info,
  Copy,
  Check,
  ExternalLink,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react'

const CATEGORIES = [
  { key: 'emergency', label: 'Emergency Contacts', icon: '🚨' },
  { key: 'wifi', label: 'WiFi Passwords', icon: '📶' },
  { key: 'school', label: 'School Portals', icon: '🏫' },
  { key: 'services', label: 'Service Providers', icon: '🔧' },
  { key: 'other', label: 'Other', icon: '📋' },
]

interface InfoForm {
  category: string
  title: string
  content: string
  url: string
}

const emptyForm: InfoForm = {
  category: 'other',
  title: '',
  content: '',
  url: '',
}

export default function InfoPage() {
  const [items, setItems] = useState<ImportantInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ImportantInfo | null>(null)
  const [form, setForm] = useState<InfoForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('important_info')
        .select('*')
        .order('category')
        .order('title')

      if (err) throw err
      setItems(data ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to load info')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleCopy = async (item: ImportantInfo) => {
    try {
      await navigator.clipboard.writeText(item.content)
      setCopiedId(item.id)
      showToast('Copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      showToast('Failed to copy')
    }
  }

  const openAdd = (category?: string) => {
    setEditingItem(null)
    setForm({ ...emptyForm, category: category ?? 'other' })
    setDialogOpen(true)
  }

  const openEdit = (item: ImportantInfo) => {
    setEditingItem(item)
    setForm({
      category: item.category,
      title: item.title,
      content: item.content,
      url: item.url ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    const supabase = createClient()

    const payload = {
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      url: form.url.trim() || null,
    }

    try {
      if (editingItem) {
        const { error } = await supabase.from('important_info').update(payload).eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('important_info').insert(payload)
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
    if (!confirm('Delete this item?')) return
    const supabase = createClient()
    await supabase.from('important_info').delete().eq('id', id)
    fetchData()
  }

  const filtered = items.filter(item => {
    const matchCategory = activeCategory === 'all' || item.category === activeCategory
    const matchSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const groupedByCategory = CATEGORIES.map(cat => ({
    ...cat,
    items: filtered.filter(i => i.category === cat.key),
  })).filter(cat => cat.items.length > 0)

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Info className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Important Info</h1>
            <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => openAdd()} className="bg-teal-500 hover:bg-teal-600 text-white min-h-[44px] gap-2">
          <Plus className="w-4 h-4" /> Add Info
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search info..."
          className="pl-9 h-11"
        />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors min-h-[40px]',
            activeCategory === 'all'
              ? 'bg-teal-500 text-white border-teal-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
          )}
        >
          All
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.key).length
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors min-h-[40px]',
                activeCategory === cat.key
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-bold',
                  activeCategory === cat.key ? 'bg-white/20' : 'bg-gray-100'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Info className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {searchQuery ? 'No results found' : 'No info items yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {searchQuery ? 'Try a different search term' : 'Add important info for your family'}
          </p>
          {!searchQuery && (
            <Button onClick={() => openAdd(activeCategory !== 'all' ? activeCategory : undefined)} className="mt-4 bg-teal-500 hover:bg-teal-600 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {activeCategory === 'all' ? (
            groupedByCategory.map(group => (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{group.icon}</span>
                    <h2 className="text-sm font-semibold text-gray-700">{group.label}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.items.length}</span>
                  </div>
                  <button
                    onClick={() => openAdd(group.key)}
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map(item => (
                    <InfoCard
                      key={item.id}
                      item={item}
                      isCopied={copiedId === item.id}
                      onCopy={() => handleCopy(item)}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(item => (
                <InfoCard
                  key={item.id}
                  item={item}
                  isCopied={copiedId === item.id}
                  onCopy={() => handleCopy(item)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Info' : 'Add Info'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.key} value={c.key}>
                      <span className="flex items-center gap-2">
                        <span>{c.icon}</span> {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="info-title">Title *</Label>
              <Input
                id="info-title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Home WiFi Password"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="info-content">Content *</Label>
              <Textarea
                id="info-content"
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="e.g. Network: HomeWifi_5G&#10;Password: securepass123"
                rows={4}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="info-url">URL (optional)</Label>
              <Input
                id="info-url"
                type="url"
                value={form.url}
                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? 'Save Changes' : 'Add Info'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4 text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  )
}

interface InfoCardProps {
  item: ImportantInfo
  isCopied: boolean
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}

function InfoCard({ item, isCopied, onCopy, onEdit, onDelete }: InfoCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 hover:border-teal-100 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 leading-tight">{item.title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-mono bg-gray-50 rounded-xl px-3 py-2.5 break-all">
        {item.content}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[32px]',
            isCopied
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-600'
          )}
        >
          {isCopied ? (
            <><Check className="w-3.5 h-3.5" /> Copied!</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors min-h-[32px]"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Link
          </a>
        )}
      </div>
    </div>
  )
}
