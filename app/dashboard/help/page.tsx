'use client'

import { useState } from 'react'
import {
  HelpCircle, LayoutDashboard, Calendar, CheckSquare, ShoppingCart,
  UtensilsCrossed, Sparkles, Image, Bell, Info, Settings, Users,
  Smartphone, Link2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Section {
  icon: React.ElementType
  title: string
  color: string
  content: React.ReactNode
}

function Accordion({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="space-y-2">
      {sections.map((s, i) => {
        const Icon = s.icon
        const isOpen = open === i
        return (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', s.color)}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="flex-1 text-sm font-semibold text-gray-800">{s.title}</span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-sm text-gray-600 space-y-3 border-t border-gray-50">
                {s.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-none space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
      <span className="text-teal-500 font-bold text-xs mt-0.5 shrink-0">TIP</span>
      <span className="text-teal-800 text-xs">{children}</span>
    </div>
  )
}

const SECTIONS: Section[] = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    color: 'bg-teal-500',
    content: (
      <>
        <P>The Dashboard is your home base — a real-time overview of your household at a glance.</P>
        <Steps items={[
          'Live clock shows the current time and date in 12-hour format.',
          'Today\'s Schedule lists all events happening today across your family calendar.',
          'Weather Widget shows current temperature, conditions, humidity, and wind for your saved city.',
          'Who Is Home shows each family member\'s current status — tap your card to toggle between Home, Away, School, or Work.',
          'Photo of the Day cycles through your shared family photos.',
          'Quick action buttons at the top let you add a new Event, Task, or Shopping Item without navigating away.',
        ]} />
        <Tip>Set your city in Settings → Weather City to activate the weather widget.</Tip>
      </>
    ),
  },
  {
    icon: Calendar,
    title: 'Family Calendar',
    color: 'bg-blue-500',
    content: (
      <>
        <P>A shared calendar visible to all family members. Switch between Month, Week, and Day views.</P>
        <Steps items={[
          'Click any date cell to add a new event on that day.',
          'Click an existing event chip to edit or delete it.',
          'Each event can have a title, description, location, category, color, assigned family member, repeat pattern, and reminder.',
          'Use the "+" button in the top-right to add an event for today.',
          'The colored legend at the top shows which events belong to which family member.',
        ]} />
        <Tip>Events are color-coded by family member. Assign the right member when creating events to keep things organized.</Tip>
      </>
    ),
  },
  {
    icon: CheckSquare,
    title: 'Tasks',
    color: 'bg-indigo-500',
    content: (
      <>
        <P>A shared to-do list for the whole family. Tasks can be assigned to specific members with due dates and priorities.</P>
        <Steps items={[
          'Click "+ Add Task" to create a new task with title, description, due date, priority, and assigned member.',
          'Check the checkbox on a task to mark it complete.',
          'Filter tasks by assignee, status, or priority using the filter controls.',
          'Tasks with due dates appear in the Family Calendar.',
        ]} />
      </>
    ),
  },
  {
    icon: ShoppingCart,
    title: 'Shopping',
    color: 'bg-orange-500',
    content: (
      <>
        <P>A shared grocery and shopping list. Anyone can add items, and anyone can check them off while at the store.</P>
        <Steps items={[
          'Tap "+ Add Item" to add something to the list with a name, quantity, and optional category.',
          'Check an item off to mark it as in-cart or purchased.',
          'Items are organized by category (produce, dairy, etc.) for easy store navigation.',
          'Clear all checked items at once using the "Clear completed" button.',
        ]} />
        <Tip>You can add items straight from the Dashboard's quick action bar — no need to navigate to Shopping first.</Tip>
      </>
    ),
  },
  {
    icon: UtensilsCrossed,
    title: 'Meals',
    color: 'bg-rose-500',
    content: (
      <>
        <P>Plan your family's meals for the week. Set breakfast, lunch, and dinner for any day.</P>
        <Steps items={[
          'Click a day cell to add or edit a meal for that slot.',
          'Each meal entry has a name, notes, and optional assigned cook.',
          'Navigate between weeks using the arrow buttons.',
          'The current day is highlighted so you can quickly see tonight\'s dinner.',
        ]} />
      </>
    ),
  },
  {
    icon: Sparkles,
    title: 'Chores',
    color: 'bg-yellow-500',
    content: (
      <>
        <P>Assign recurring or one-time chores to family members and track completion.</P>
        <Steps items={[
          'Click "+ Add Chore" to create a chore with a name, assigned member, frequency (daily/weekly/monthly), and point value.',
          'Mark a chore complete by clicking the checkmark — it records who completed it and when.',
          'Recurring chores automatically reset based on their frequency.',
          'Point totals let you gamify chore completion for kids.',
        ]} />
        <Tip>Assign point values to chores to motivate younger family members with a leaderboard.</Tip>
      </>
    ),
  },
  {
    icon: Image,
    title: 'Photos',
    color: 'bg-purple-500',
    content: (
      <>
        <P>A shared family photo album. Upload memories that everyone in the household can view.</P>
        <Steps items={[
          'Click "Upload Photo" to add images from your device.',
          'Photos appear in a grid and cycle through on the dashboard\'s Photo of the Day widget.',
          'Click any photo to view it full-size.',
          'Delete a photo by opening it and clicking the trash icon (admins only).',
        ]} />
      </>
    ),
  },
  {
    icon: Bell,
    title: 'Announcements',
    color: 'bg-amber-500',
    content: (
      <>
        <P>Post important messages or notices for the whole family to see, pinned at the top of the dashboard.</P>
        <Steps items={[
          'Click "+ New Announcement" to write a message with a title and body.',
          'Pin an announcement to keep it visible at the top.',
          'Announcements show who posted them and when.',
          'Archive old announcements to declutter without deleting.',
        ]} />
      </>
    ),
  },
  {
    icon: Info,
    title: 'Info',
    color: 'bg-cyan-500',
    content: (
      <>
        <P>A quick-reference board for important household information — emergency contacts, WiFi passwords, school schedules, and more.</P>
        <Steps items={[
          'Click "+ Add Info" to create a card with a title and content.',
          'Organize cards by category (Emergency, School, Home, Medical, etc.).',
          'Pin the most important cards so they stay at the top.',
          'Info cards are visible to all family members.',
        ]} />
      </>
    ),
  },
  {
    icon: Users,
    title: 'Family Linking (Invites)',
    color: 'bg-teal-600',
    content: (
      <>
        <P>Every family has a unique invite link generated for the admin account. Here's how to add family members:</P>
        <Steps items={[
          'Go to Settings (admin account required).',
          'Scroll to the "Family Sharing" section.',
          'Copy your unique invite link — it looks like: fullfamilyhub.vercel.app/signup?invite=XXXXXX',
          'Send it to each family member via text, email, or any messaging app.',
          'They click the link, create their own account, and set up their profile.',
          'Once signed up, they automatically share calendars, chores, shopping lists, photos, and all other family data.',
        ]} />
        <Tip>Each invite link is unique to your family. Don't share it publicly — anyone with the link can join your family hub.</Tip>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 mt-2">
          <p className="text-xs text-amber-800"><span className="font-bold">Note:</span> Only admin accounts can see and share the invite link. When you first sign up, choose the "Admin" role in the setup screen if you're the family organizer.</p>
        </div>
      </>
    ),
  },
  {
    icon: Settings,
    title: 'Settings',
    color: 'bg-gray-500',
    content: (
      <>
        <P>Manage your family hub preferences, members, and account details.</P>
        <Steps items={[
          'Family Members (admin only): Add, edit, or deactivate family member profiles. Each profile has a name, color, role, and optional birthday.',
          'Registered Users Report (admin only): See all accounts that have signed up, with emails, join dates, and profile completion status.',
          'Weather City: Type a city name and select from the autocomplete dropdown to set your weather location.',
          'Family Sharing: Copy your unique invite link to share with family members.',
          'Notification Preferences: Toggle which types of updates you want to be notified about.',
          'Change Password: Update your login password.',
          'Sign Out: Log out of your account.',
        ]} />
      </>
    ),
  },
  {
    icon: Smartphone,
    title: 'Installing on Mobile (PWA)',
    color: 'bg-green-500',
    content: (
      <>
        <P>Family Hub is a Progressive Web App (PWA) — you can install it on your phone's home screen for a native app-like experience with no App Store required.</P>
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-gray-700 mb-2">iPhone / iPad (Safari)</p>
            <Steps items={[
              'Open fullfamilyhub.vercel.app in Safari.',
              'Tap the Share button (box with arrow pointing up) at the bottom of the screen.',
              'Scroll down and tap "Add to Home Screen".',
              'Give it a name (e.g. "Family Hub") and tap "Add".',
              'The app icon now appears on your home screen — tap it to open like any app.',
            ]} />
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Android (Chrome)</p>
            <Steps items={[
              'Open fullfamilyhub.vercel.app in Chrome.',
              'Tap the three-dot menu (⋮) in the top-right corner.',
              'Tap "Add to Home screen" or "Install app".',
              'Confirm by tapping "Add" or "Install".',
              'The app appears on your home screen and in your app drawer.',
            ]} />
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Windows / Mac (Chrome or Edge)</p>
            <Steps items={[
              'Open fullfamilyhub.vercel.app.',
              'Look for the install icon in the address bar (a computer screen with a down arrow), or go to the browser menu → "Install Family Hub".',
              'Click Install — it opens as a standalone window without browser UI.',
            ]} />
          </div>
        </div>
        <Tip>After installing, the app works offline for viewing cached data and loads much faster than opening in a browser tab.</Tip>
      </>
    ),
  },
]

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Guide</h1>
          <p className="text-sm text-gray-500">Everything you need to know about Family Hub</p>
        </div>
      </div>

      {/* Intro card */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm">
        <p className="text-sm font-medium opacity-90 leading-relaxed">
          Family Hub is your household's smart command center — a shared space for calendars, chores, shopping, meals, photos, and more. Click any section below to learn how it works.
        </p>
      </div>

      <Accordion sections={SECTIONS} />
    </div>
  )
}
