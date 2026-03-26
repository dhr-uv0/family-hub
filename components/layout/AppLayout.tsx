'use client'

import { Toaster } from '@/components/ui/toaster'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration'
import { VoiceInput } from '@/components/voice/VoiceInput'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <ServiceWorkerRegistration />
      {/*
        Layout structure:
        Mobile (<md):   flex-col — sticky header at top, scrollable content, fixed bottom nav
        Tablet/Desktop (md+): flex-row — sticky sidebar (w-64) on left,
                               flex-col right side with sticky header + scrollable content
      */}
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar - tablet/desktop only (hidden on mobile) */}
        <Sidebar />

        {/* Main area: takes remaining width, stacks header + content vertically */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 shrink-0">
            <Header />
          </div>

          {/* Scrollable content area */}
          <main className="flex-1 overflow-y-auto">
            {/*
              Bottom padding:
              - pb-20 on mobile to clear the fixed bottom nav
              - pb-6 on md+ where bottom nav is hidden
            */}
            <div className="px-4 py-4 md:px-6 md:py-6 pb-20 md:pb-6">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom nav - mobile only (hidden on md+) */}
        <BottomNav />

        {/* Toast notifications */}
        <Toaster />

        {/* Voice input FAB */}
        <VoiceInput />
      </div>
    </>
  )
}
