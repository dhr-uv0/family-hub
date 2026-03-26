'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CheckSquare,
  ShoppingCart,
  UtensilsCrossed,
  Sparkles,
  Image,
  Bell,
  Info,
  Settings,
  Home,
} from 'lucide-react'
import { useAppMode } from '@/lib/hooks/useAppMode'
import { ModeSwitch } from './ModeSwitch'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  modes: ('family' | 'personal' | 'both')[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, modes: ['both'] },
  { label: 'Family Calendar', href: '/dashboard/calendar', icon: Calendar, modes: ['family'] },
  { label: 'My Calendar', href: '/dashboard/my-calendar', icon: CalendarDays, modes: ['personal'] },
  { label: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, modes: ['both'] },
  { label: 'Shopping', href: '/dashboard/shopping', icon: ShoppingCart, modes: ['both'] },
  { label: 'Meals', href: '/dashboard/meals', icon: UtensilsCrossed, modes: ['family'] },
  { label: 'Chores', href: '/dashboard/chores', icon: Sparkles, modes: ['family'] },
  { label: 'Photos', href: '/dashboard/photos', icon: Image, modes: ['family'] },
  { label: 'Announcements', href: '/dashboard/announcements', icon: Bell, modes: ['family'] },
  { label: 'Info', href: '/dashboard/info', icon: Info, modes: ['family'] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, modes: ['both'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { mode } = useAppMode()

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.modes.includes('both') || item.modes.includes(mode)
  )

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 sticky top-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-500 text-white shrink-0">
          <Home className="w-5 h-5" />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Family Hub</span>
      </div>

      {/* Mode Switch */}
      <div className="px-5 py-4 border-b border-gray-100">
        <ModeSwitch />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  active ? 'text-teal-600' : 'text-gray-400'
                )}
              />
              {item.label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom accent */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Family Hub v1.0</p>
      </div>
    </aside>
  )
}
