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

  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col items-center justify-center py-6 select-none">
      <div className="flex items-end gap-1">
        <span className="text-5xl font-bold text-teal-500 tabular-nums leading-none">
          {hours}:{minutes}
        </span>
        <span className="text-2xl font-semibold text-teal-400 tabular-nums leading-none mb-0.5">
          :{seconds}
        </span>
      </div>
      <p className="text-xl font-medium text-gray-600 mt-2">{dateStr}</p>
    </div>
  )
}
