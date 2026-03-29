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
  BarChart2,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { searchCities, type GeoResult } from '@/lib/weather'
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
  const [familyInviteCode, setFamilyInviteCode] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [adminReport, setAdminReport] = useState<any[] | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<GeoResult[]>([])
  const [citySearching, setCitySearching] = useState(false)

  const handleCitySearch = async (q: string) => {
    setCityQuery(q)
    if (q.length < 2) { setCitySuggestions([]); return }
    setCitySearching(true)
    const results = await searchCities(q)
    setCitySuggestions(results)
    setCitySearching(false)
  }

  const selectCity = (result: GeoResult) => {
    const label = result.admin1
      ? `${result.name}, ${result.admin1}, ${result.country}`
      : `${result.name}, ${result.country}`
    setWeatherCity(label)
    setCityQuery(label)
    setCitySuggestions([])
    localStorage.setItem('weatherCity', label)
    // Bust the weather cache so it reloads with new city
    localStorage.removeItem('weather_cache')
    setWeatherSaved(true)
    setTimeout(() => setWeatherSaved(false), 2000)
  }

  const fetchAdminReport = async () => {
    setReportLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setAdminReport(json.users ?? [])
    } catch {
      setAdminReport([])
    } finally {
      setReportLoading(false)
    }
  }

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
        const admin = me?.role === 'admin'
        setIsAdmin(admin)

        // Load or create family invite code for admins
        if (admin) {
          const { data: family } = await supabase
            .from('families')
            .select('invite_code')
            .eq('created_by', user.id)
            .maybeSingle()

          if (family) {
            setFamilyInviteCode(family.invite_code)
          } else {
            const { data: newFamily } = await supabase
              .from('families')
              .insert({ created_by: user.id })
              .select('invite_code')
              .single()
            if (newFamily) setFamilyInviteCode(newFamily.invite_code)
          }
        }
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

      {/* Admin: User & Family Report */}
      {isAdmin && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-gray-700">Registered Users Report</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-gray-600"
              onClick={fetchAdminReport}
              disabled={reportLoading}
            >
              {reportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {adminReport === null ? 'Load Report' : 'Refresh'}
            </Button>
          </div>
          {adminReport === null ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              Click &quot;Load Report&quot; to see all registered users.
            </div>
          ) : adminReport.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No users found.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {adminReport.map(u => (
                <div key={u.id} className="px-5 py-3.5 flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
                    style={{ backgroundColor: u.profile?.color ?? '#94a3b8' }}
                  >
                    {u.profile?.name ? u.profile.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {u.profile?.name ?? 'No profile yet'}
                      </span>
                      {u.profile?.nickname && (
                        <span className="text-xs text-gray-400">({u.profile.nickname})</span>
                      )}
                      {u.profile?.role && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                          u.profile.role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          {u.profile.role}
                        </span>
                      )}
                      {!u.confirmed && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          unconfirmed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {u.last_sign_in && (
                        <> · Last active {new Date(u.last_sign_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {adminReport !== null && adminReport.length > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              {adminReport.length} registered user{adminReport.length !== 1 ? 's' : ''} total
              {' · '}
              {adminReport.filter(u => u.profile).length} with completed profiles
            </div>
          )}
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
            <p className="text-xs text-gray-400 mb-2">Start typing to search — select a city from the list</p>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={cityQuery || weatherCity}
                    onChange={e => handleCitySearch(e.target.value)}
                    placeholder="e.g. Seattle, Sammamish..."
                    className="flex-1 pr-8"
                    autoComplete="off"
                  />
                  {citySearching && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
                <Button
                  onClick={() => { localStorage.setItem('weatherCity', weatherCity); setWeatherSaved(true); setTimeout(() => setWeatherSaved(false), 2000) }}
                  className={cn('transition-colors shrink-0', weatherSaved ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-teal-500 hover:bg-teal-600 text-white')}
                >
                  {weatherSaved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save'}
                </Button>
              </div>
              {citySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-12 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  {citySuggestions.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectCity(r)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium text-gray-800">{r.name}</span>
                      {r.admin1 && <span className="text-gray-400">, {r.admin1}</span>}
                      <span className="text-gray-400">, {r.country}</span>
                    </button>
                  ))}
                </div>
              )}
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
          {isAdmin && familyInviteCode ? (
            <>
              <p className="text-sm text-gray-500">
                Share this unique invite link with family members. Each person who signs up through this link is connected to your family.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/signup?invite=${familyInviteCode}` : ''}
                  className="flex-1 bg-gray-50 text-gray-600 text-xs font-mono"
                  aria-label="Family invite link"
                />
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'shrink-0 gap-1.5 transition-colors',
                    inviteCopied ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-50' : 'border-gray-200 text-gray-600 hover:border-teal-300'
                  )}
                  onClick={async () => {
                    const url = `${window.location.origin}/signup?invite=${familyInviteCode}`
                    try {
                      await navigator.clipboard.writeText(url)
                      setInviteCopied(true)
                      setTimeout(() => setInviteCopied(false), 2000)
                    } catch { /* blocked */ }
                  }}
                >
                  {inviteCopied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                </Button>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-teal-50 rounded-lg">
                <span className="text-teal-600 text-xs font-semibold">Invite code:</span>
                <code className="text-teal-700 font-mono font-bold tracking-widest">{familyInviteCode}</code>
              </div>
              <p className="text-xs text-gray-400">
                Each person gets their own login. Once signed up via this link they&apos;ll share calendars, chores, shopping lists, and more.
              </p>
            </>
          ) : isAdmin ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
              <span className="text-sm text-gray-400">Generating your invite link...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Ask your family admin for the invite link to share with additional members.
            </p>
          )}
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
