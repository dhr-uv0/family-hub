'use client'

import { useState } from 'react'
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
  MoreHorizontal,
  X,
} from 'lucide-react'
import { useAppMode } from '@/lib/hooks/useAppMode'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  modes: ('family' | 'personal' | 'both')[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, modes: ['both'] },
  { label: 'Calendar', href: '/dashboard/calendar', icon: Calendar, modes: ['family'] },
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

export function BottomNav() {
  const pathname = usePathname()
  const { mode } = useAppMode()
  const [moreOpen, setMoreOpen] = useState(false)

  const visibleItems = ALL_NAV_ITEMS.filter(
    (item) => item.modes.includes('both') || item.modes.includes(mode)
  )

  // First 4 primary tabs + More
  const primaryItems = visibleItems.slice(0, 4)
  const overflowItems = visibleItems.slice(4)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const isMoreActive = overflowItems.some((item) => isActive(item.href))

  return (
    <>
      {/* Overlay for more sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 md:hidden',
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-base font-semibold text-gray-900">More</span>
          <button
            onClick={() => setMoreOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <nav className="px-4 py-3 grid grid-cols-2 gap-1">
          {overflowItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
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
              </Link>
            )
          })}
        </nav>
        <div className="h-2" />
      </div>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center">
          {primaryItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1 min-h-[56px] min-w-0"
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      active ? 'text-teal-600' : 'text-gray-400'
                    )}
                  />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium truncate max-w-full px-1 transition-colors',
                    active ? 'text-teal-600' : 'text-gray-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          {overflowItems.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1 min-h-[56px] min-w-0"
              aria-label="More navigation options"
            >
              <div className="relative flex items-center justify-center">
                <MoreHorizontal
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isMoreActive || moreOpen ? 'text-teal-600' : 'text-gray-400'
                  )}
                />
                {(isMoreActive || moreOpen) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  isMoreActive || moreOpen ? 'text-teal-600' : 'text-gray-400'
                )}
              >
                More
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
