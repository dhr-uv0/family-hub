'use client'

import { Users, User } from 'lucide-react'
import { useAppMode } from '@/lib/hooks/useAppMode'
import { cn } from '@/lib/utils'

export function ModeSwitch() {
  const { mode, toggleMode } = useAppMode()
  const isFamily = mode === 'family'

  return (
    <div className="flex items-center gap-2 select-none">
      <button
        onClick={toggleMode}
        aria-label={`Switch to ${isFamily ? 'personal' : 'family'} mode`}
        className={cn(
          'relative flex items-center w-[72px] h-9 rounded-full p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isFamily
            ? 'bg-teal-500 focus-visible:ring-teal-500'
            : 'bg-purple-500 focus-visible:ring-purple-500'
        )}
      >
        {/* Track icons */}
        <span
          className={cn(
            'absolute left-2 transition-opacity duration-300',
            isFamily ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Users className="w-4 h-4 text-white" />
        </span>
        <span
          className={cn(
            'absolute right-2 transition-opacity duration-300',
            isFamily ? 'opacity-0' : 'opacity-100'
          )}
        >
          <User className="w-4 h-4 text-white" />
        </span>

        {/* Thumb */}
        <span
          className={cn(
            'relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white shadow-sm transition-transform duration-300',
            isFamily ? 'translate-x-0' : 'translate-x-[36px]'
          )}
        >
          {isFamily ? (
            <Users className="w-3.5 h-3.5 text-teal-600" />
          ) : (
            <User className="w-3.5 h-3.5 text-purple-600" />
          )}
        </span>
      </button>

      <span
        className={cn(
          'text-sm font-medium transition-colors duration-300',
          isFamily ? 'text-teal-700' : 'text-purple-700'
        )}
      >
        {isFamily ? 'Family' : 'Personal'}
      </span>
    </div>
  )
}
