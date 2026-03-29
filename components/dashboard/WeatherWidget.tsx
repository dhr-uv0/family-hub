'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchWeather } from '@/lib/weather'
import { WeatherData } from '@/lib/types'

interface WeatherWidgetProps {
  initialWeather?: WeatherData
}

function SkeletonRow({ width }: { width: string }) {
  return <div className={`h-4 bg-gray-200 rounded animate-pulse ${width}`} />
}

export default function WeatherWidget({ initialWeather }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather ?? null)
  const [loading, setLoading] = useState(!initialWeather)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchWeather()
    if (data) setWeather(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!initialWeather) load()
    const interval = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load, initialWeather])

  if (loading && !weather) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonRow width="w-24" />
          <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        <SkeletonRow width="w-32" />
        <div className="flex gap-4">
          <SkeletonRow width="w-16" />
          <SkeletonRow width="w-16" />
        </div>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 min-h-[140px]">
        <span className="text-3xl">🌡️</span>
        <p className="text-sm text-gray-400 text-center">
          Set your city in <span className="text-teal-600 font-medium">Settings → Weather City</span>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {weather.city}, {weather.country}
        </p>
        <span className="text-4xl leading-none">{weather.icon}</span>
      </div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-5xl font-bold text-teal-500">{weather.temp}</span>
        <span className="text-2xl font-semibold text-gray-400 mb-1">°F</span>
      </div>
      <p className="text-sm text-gray-600 capitalize mb-3">{weather.description}</p>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">💧 {weather.humidity}% humidity</span>
        <span className="flex items-center gap-1">💨 {weather.wind_speed} mph</span>
        <span className="flex items-center gap-1">🌡️ Feels {weather.feels_like}°</span>
      </div>
    </div>
  )
}
