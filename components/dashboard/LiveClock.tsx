'use client'

import { useEffect, useState } from 'react'

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!now) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="h-14 w-48 bg-gray-100 rounded-lg animate-pulse mb-2" />
        <div className="h-6 w-36 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  const rawHours = now.getHours()
  const ampm = rawHours >= 12 ? 'PM' : 'AM'
  const hours = (rawHours % 12 || 12).toString()
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      <span className="absolute top-2 right-2 text-xs font-medium text-gray-400">PST</span>
      <div className="flex items-end gap-1">
        <span className="text-5xl font-bold text-teal-500 tabular-nums leading-none">
          {hours}:{minutes}
        </span>
        <span className="text-2xl font-semibold text-teal-400 tabular-nums leading-none mb-0.5">
          :{seconds}
        </span>
        <span className="text-lg font-semibold text-teal-400 leading-none mb-1 ml-0.5">
          {ampm}
        </span>
      </div>
      <p className="text-xl font-medium text-gray-600 mt-2">{dateStr}</p>
    </div>
  )
}
