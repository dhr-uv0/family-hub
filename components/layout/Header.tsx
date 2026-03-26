'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Home, Clock, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ModeSwitch } from './ModeSwitch'
import { cn } from '@/lib/utils'

function LiveClock() {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium tabular-nums">
      <Clock className="w-4 h-4 text-gray-400" />
      <span>{time}</span>
    </div>
  )
}

interface UserDropdownProps {
  email: string | undefined
}

function UserDropdown({ email }: UserDropdownProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown="user"]')) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const initials = email ? email.slice(0, 2).toUpperCase() : 'U'

  return (
    <div className="relative" data-dropdown="user">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 min-h-[44px] px-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm flex items-center justify-center select-none">
          {initials}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200 hidden sm:block',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1 overflow-hidden">
          {email && (
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs text-gray-400 truncate">{email}</p>
            </div>
          )}
          <Link
            href="/dashboard/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <User className="w-4 h-4 text-gray-400" />
            Profile
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            <Settings className="w-4 h-4 text-gray-400" />
            Settings
          </Link>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function Header() {
  const [email, setEmail] = useState<string | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email)
    })
  }, [])

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 flex items-center h-14 px-4 gap-4">
      {/* Logo - visible on mobile, hidden on md+ where sidebar shows it */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 md:hidden min-h-[44px]"
        aria-label="Family Hub home"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500 text-white">
          <Home className="w-4 h-4" />
        </div>
        <span className="text-base font-bold text-gray-900">Family Hub</span>
      </Link>

      {/* Center: Mode Switch */}
      <div className="flex-1 flex justify-center md:justify-start">
        <ModeSwitch />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex">
          <LiveClock />
        </div>
        <UserDropdown email={email} />
      </div>
    </header>
  )
}
