import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function isToday(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

export function isOverdue(date: Date | string): boolean {
  return new Date(date) < new Date() && !isToday(date)
}

export const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  urgent: '#7c3aed',
}

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const CATEGORY_ICONS: Record<string, string> = {
  work: '💼',
  school: '📚',
  personal: '👤',
  health: '❤️',
  finance: '💰',
  other: '📌',
}
