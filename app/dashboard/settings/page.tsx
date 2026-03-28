'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { FamilyMember } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  Settings,
  Users,
  Pencil,
  LogOut,
  Shield,
  Info,
  Bell,
  Sun,
  MapPin,
  Lock,
  Copy,
  Check,
  Link2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const MEMBER_COLORS = [
  '#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#10b981', '#f97316', '#6366f1', '#ec4899', '#84cc16',
]

interface MemberForm {
  name: string
  nickname: string
  color: string
  role: 'admin' | 'member'
  date_of_birth: string
  sort_order: string
}

const emptyMemberForm: MemberForm = {
  name: '',
  nickname: '',
  color: '#14b8a6',
  role: 'member',
  date_of_birth: '',
  sort_order: '0',
}

interface NotificationPrefs {
  chores: boolean
  meals: boolean
  announcements: boolean
  activities: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm)
  const [savingMember, setSavingMember] = useState(false)
  const [weatherCity, setWeatherCity] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('weatherCity') ?? ''
    return ''
  })
  const [weatherSaved, setWeatherSaved] = useState(false)
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    chores: true,
    meals: false,
    announcements: true,
    activities: false,
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const [{ data: membersData, error: membersErr }, { data: { user } }] = await Promise.all([
        supabase.from('family_members').select('*').order('sort_order'),
        supabase.auth.getUser(),
      ])

      if (membersErr) throw membersErr
      setFamilyMembers(membersData ?? [])

      if (user) {
        setCurrentUser({ email: user.email, id: user.id })
        const me = (membersData ?? []).find((m: FamilyMember) => m.user_id === user.id)
        setIsAdmin(me?.role === 'admin')
      }
    } catch (err) {
      console.error(err)
      setFamilyMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openAddMember = () => {
    setEditingMember(null)
    setMemberForm({ ...emptyMemberForm, sort_order: String(familyMembers.length) })
    setMemberDialogOpen(true)
  }

  const openEditMember = (member: FamilyMember) => {
    setEditingMember(member)
    setMemberForm({
      name: member.name,
      nickname: member.nickname ?? '',
      color: member.color,
      role: member.role,
      date_of_birth: member.date_of_birth ?? '',
      sort_order: String(member.sort_order),
    })
    setMemberDialogOpen(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberForm.name.trim()) return
    setSavingMember(true)
    const supabase = createClient()

    const payload = {
      name: memberForm.name.trim(),
      nickname: memberForm.nickname.trim() || null,
      color: memberForm.color,
      role: memberForm.role,
      date_of_birth: memberForm.date_of_birth || null,
      sort_order: parseInt(memberForm.sort_order) || 0,
    }

    try {
      if (editingMember) {
        const { error } = await supabase.from('family_members').update(payload).eq('id', editingMember.id)
        if (error) throw error
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('family_members').insert({ ...payload, user_id: user?.id ?? '', is_active: true })
        if (error) throw error
      }
      setMemberDialogOpen(false)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSavingMember(false)
    }
  }

  const handleToggleActive = async (member: FamilyMember) => {
    const supabase = createClient()
    await supabase.from('family_members').update({ is_active: !member.is_active }).eq('id', member.id)
    fetchData()
  }

  const handleSaveWeather = () => {
    localStorage.setItem('weatherCity', weatherCity)
    setWeatherSaved(true)
    setTimeout(() => setWeatherSaved(false), 2000)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords don't match")
      return
    }
    if (passwordForm.next.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }
    setChangingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: passwordForm.next })
      if (error) throw error
      setPasswordSuccess(true)
      setPasswordForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.message ?? 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSignOut = async () => {
    if (!confirm('Sign out?')) return
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your Family Hub</p>
        </div>
      </div>

      {/* Family Members (admin only) */}
      {isAdmin && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-gray-700">Family Members</h2>
            </div>
            <Button onClick={openAddMember} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white h-9 gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Member
            </Button>
          </div>
          <div className="divide-y divide-gray-50">
            {familyMembers.map(member => (
              <div key={member.id} className="px-5 py-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{member.name}</span>
                    {member.nickname && <span className="text-xs text-gray-400">({member.nickname})</span>}
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold',
                      member.role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {member.role}
                    </span>
                  </div>
                  {member.date_of_birth && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      DOB: {new Date(member.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={member.is_active}
                    onCheckedChange={() => handleToggleActive(member)}
                    aria-label={member.is_active ? 'Deactivate member' : 'Activate member'}
                  />
                  <button
                    onClick={() => openEditMember(member)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {familyMembers.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No family members yet</div>
            )}
          </div>
        </section>
      )}

      {/* App Settings */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Sun className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-gray-700">App Settings</h2>
        </div>
        <div className="px-5 py-4 space-y-5">
          {/* Weather city */}
          <div>
            <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <MapPin className="w-3.5 h-3.5" /> Weather City
            </Label>
            <p className="text-xs text-gray-400 mb-2">City shown in the weather widget on the dashboard</p>
            <div className="flex gap-2">
              <Input
                value={weatherCity}
                onChange={e => setWeatherCity(e.target.value)}
                placeholder="e.g. London, UK"
                className="flex-1"
              />
              <Button onClick={handleSaveWeather} className={cn(
                'transition-colors',
                weatherSaved ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-teal-500 hover:bg-teal-600 text-white'
              )}>
                {weatherSaved ? 'Saved!' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between py-3 border-t border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">Theme</p>
              <p className="text-xs text-gray-400">Light mode only in this version</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600">
              <Sun className="w-3.5 h-3.5" /> Light
            </div>
          </div>
        </div>
      </section>

      {/* Family Sharing */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-gray-700">Family Sharing</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-500">
            Share this link with family members so they can create their own account and access shared data.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup'}
              className="flex-1 bg-gray-50 text-gray-600 text-sm font-mono"
              aria-label="Signup link"
            />
            <Button
              type="button"
              variant="outline"
              className={cn(
                'shrink-0 gap-1.5 transition-colors',
                linkCopied ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-50' : 'border-gray-200 text-gray-600 hover:border-teal-300'
              )}
              onClick={async () => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup'
                try {
                  await navigator.clipboard.writeText(url)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                } catch {
                  /* clipboard blocked */
                }
              }}
            >
              {linkCopied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Each family member signs up with their own email. Once registered they&apos;ll have access to shared calendars, chores, and more.
          </p>
        </div>
      </section>

      {/* Notification preferences */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Bell className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-gray-700">Notification Preferences</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { key: 'announcements' as const, label: 'Announcements', desc: 'New family announcements' },
            { key: 'chores' as const, label: 'Chores', desc: 'Chore reminders and completions' },
            { key: 'meals' as const, label: 'Meal Planner', desc: 'Meal plan updates' },
            { key: 'activities' as const, label: 'Activities', desc: 'Upcoming activity reminders' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <Switch
                checked={notifications[item.key]}
                onCheckedChange={v => setNotifications(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Account */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-gray-700">Account</h2>
        </div>
        <div className="px-5 py-4 space-y-5">
          {currentUser?.email && (
            <div>
              <Label className="text-xs text-gray-400 uppercase tracking-wider">Email</Label>
              <p className="text-sm text-gray-700 mt-1 font-medium">{currentUser.email}</p>
            </div>
          )}

          {/* Change password */}
          <div className="border-t border-gray-50 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-3.5 h-3.5 text-gray-500" />
              <Label className="text-sm font-medium text-gray-700">Change Password</Label>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input
                type="password"
                placeholder="New password"
                value={passwordForm.next}
                onChange={e => setPasswordForm(p => ({ ...p, next: e.target.value }))}
                className="h-10"
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                className="h-10"
              />
              {passwordError && (
                <p className="text-xs text-red-500">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-green-600 font-medium">Password updated successfully!</p>
              )}
              <Button
                type="submit"
                disabled={changingPassword || !passwordForm.next}
                variant="outline"
                className="w-full"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </Button>
            </form>
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-50 pt-4">
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 min-h-[44px] gap-2"
            >
              {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Sign Out
            </Button>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-gray-700">About</h2>
        </div>
        <div className="px-5 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white text-xl font-bold shadow-sm">
            🏠
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">Family Hub</p>
            <p className="text-sm text-gray-500">Version 1.0.0</p>
            <p className="text-xs text-gray-400 mt-0.5">Built with love for families</p>
          </div>
        </div>
      </section>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Member' : 'Add Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMember} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="member-name">Name *</Label>
              <Input
                id="member-name"
                value={memberForm.name}
                onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sarah"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="member-nickname">Nickname</Label>
              <Input
                id="member-nickname"
                value={memberForm.nickname}
                onChange={e => setMemberForm(p => ({ ...p, nickname: e.target.value }))}
                placeholder="e.g. Mom"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {MEMBER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setMemberForm(p => ({ ...p, color }))}
                    className={cn(
                      'w-9 h-9 rounded-full border-2 transition-all',
                      memberForm.color === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={memberForm.role} onValueChange={v => setMemberForm(p => ({ ...p, role: v as any }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="member-sort">Sort Order</Label>
                <Input
                  id="member-sort"
                  type="number"
                  min="0"
                  value={memberForm.sort_order}
                  onChange={e => setMemberForm(p => ({ ...p, sort_order: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="member-dob">Date of Birth</Label>
              <Input
                id="member-dob"
                type="date"
                value={memberForm.date_of_birth}
                onChange={e => setMemberForm(p => ({ ...p, date_of_birth: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setMemberDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={savingMember} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                {savingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : editingMember ? 'Save Changes' : 'Add Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
