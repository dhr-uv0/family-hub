'use client'
import { useState, useEffect } from 'react'
import { AppMode } from '@/lib/types'

export function useAppMode() {
  const [mode, setMode] = useState<AppMode>('family')

  useEffect(() => {
    const saved = localStorage.getItem('app_mode') as AppMode
    if (saved) setMode(saved)
  }, [])

  const toggleMode = () => {
    const newMode: AppMode = mode === 'family' ? 'personal' : 'family'
    setMode(newMode)
    localStorage.setItem('app_mode', newMode)
  }

  return { mode, setMode, toggleMode }
}
