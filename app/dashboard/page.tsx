'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AnnouncementsBanner from '@/components/dashboard/AnnouncementsBanner'
import LiveClock from '@/components/dashboard/LiveClock'
import TodaySchedule from '@/components/dashboard/TodaySchedule'
import WhoIsHome from '@/components/dashboard/WhoIsHome'
import WeatherWidget from '@/components/dashboard/WeatherWidget'
import PhotoOfDay from '@/components/dashboard/PhotoOfDay'
import { MorningBriefing } from '@/components/dashboard/MorningBriefing'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface QuickAction {
  label: string
  icon: string
  href: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Add Event', icon: '📅', href: '/dashboard/calendar?action=new' },
  { label: 'Add Task', icon: '✅', href: '/dashboard/tasks?action=new' },
  { label: 'Add Shopping Item', icon: '🛒', href: '/dashboard/shopping?action=new' },
]

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}! 👋
        </h1>
      </div>

      {/* Morning briefing — only shows 5-10am */}
      <MorningBriefing />

      {/* Announcements — full width */}
      <AnnouncementsBanner />

      {/* Quick actions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white rounded-xl text-sm font-medium whitespace-nowrap transition-colors shadow-sm"
            style={{ minHeight: '44px' }}
          >
            <span>{action.icon}</span>
            <span>+ {action.label}</span>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Left column — spans 2 on desktop */}
        <div className="lg:col-span-2 space-y-4">
          {/* Clock */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <LiveClock />
          </div>

          {/* Today's Schedule */}
          <SectionCard title="Today's Schedule">
            <TodaySchedule />
          </SectionCard>

          {/* Who Is Home */}
          <SectionCard title="Who Is Home">
            <WhoIsHome />
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Weather */}
          <WeatherWidget />

          {/* Photo of the day */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-0.5">
              Photo of the Day
            </p>
            <PhotoOfDay />
          </div>
        </div>
      </div>
    </div>
  )
}
