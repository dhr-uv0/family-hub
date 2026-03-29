'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, User, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MEMBER_COLORS = [
  { value: '#14b8a6', label: 'Teal' },
  { value: '#0d9488', label: 'Dark Teal' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f97316', label: 'Orange' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#ec4899', label: 'Pink' },
]

export default function SetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#14b8a6')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { error: insertError } = await supabase.from('family_members').insert({
        user_id: user.id,
        name: name.trim(),
        color,
        role,
        is_active: true,
        sort_order: 0,
      })

      if (insertError) throw insertError

      // Admin: create a family record so they get a unique invite link
      if (role === 'admin') {
        await supabase.from('families').insert({ created_by: user.id })
      }

      // Member joining via invite: store the invite code used in user metadata
      const pendingInvite = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('pendingInvite')
        : null
      if (pendingInvite && role === 'member') {
        await supabase.auth.updateUser({ data: { invite_code_used: pendingInvite } })
        sessionStorage.removeItem('pendingInvite')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save profile. Please try again.')
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500 text-white shadow-lg mb-4">
            <Home className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Family Hub</h1>
          <p className="text-sm text-gray-500 mt-1">Smart home command center</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Welcome to Family Hub!</h2>
            <p className="text-sm text-gray-500 mt-1">Let&apos;s set up your profile so your family can identify you.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-50 border border-red-200 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="setup-name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Your name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="setup-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane"
                  className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your color
              </label>
              <div className="flex flex-wrap gap-2">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={`Select color ${c.label}`}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'w-9 h-9 rounded-full border-2 transition-all',
                      color === c.value
                        ? 'border-gray-800 scale-110 shadow-md'
                        : 'border-transparent hover:scale-105 hover:border-gray-300'
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">This color will represent you across the app</p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Role
              </label>
              <div className="flex gap-3">
                {(['member', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'flex-1 py-2.5 min-h-[44px] rounded-lg border text-sm font-medium capitalize transition-colors',
                      role === r
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-teal-300'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Admins can manage family members and settings</p>
            </div>

            {/* Preview */}
            {name.trim() && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {name.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{name.trim()}</p>
                  <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                  )}>
                    {role}
                  </span>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className={cn(
                'w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors',
                (loading || !name.trim()) && 'opacity-60 cursor-not-allowed'
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save and continue'}
            </button>
          </form>

          {/* Skip */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4 py-2 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
