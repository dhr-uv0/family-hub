'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchWeather } from '@/lib/weather'
import { WeatherData } from '@/lib/types'

interface WeatherWidgetProps {
  initialWeather?: WeatherData
}

function getWeatherEmoji(icon: string): string {
  const code = icon.replace('n', 'd') // normalize night to day
  const map: Record<string, string> = {
    '01d': '☀️',
    '02d': '⛅',
    '03d': '☁️',
    '04d': '☁️',
    '09d': '🌧️',
    '10d': '🌦️',
    '11d': '⛈️',
    '13d': '❄️',
    '50d': '🌫️',
  }
  return map[code] ?? '🌡️'
}

function SkeletonRow({ width }: { width: string }) {
  return <div className={`h-4 bg-gray-200 rounded animate-pulse ${width}`} />
}

export default function WeatherWidget({ initialWeather }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather ?? null)
  const [loading, setLoading] = useState(!initialWeather)
  const [noApiKey, setNoApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
    if (!apiKey) {
      setNoApiKey(true)
      setLoading(false)
      return
    }
    const data = await fetchWeather()
    if (data) {
      setWeather(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!initialWeather) {
      load()
    }
    // Refresh every 30 minutes
    const interval = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load, initialWeather])

  if (noApiKey) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 min-h-[140px]">
        <span className="text-3xl">🌡️</span>
        <p className="text-sm font-medium text-gray-500 text-center">
          Configure <span className="text-teal-600">NEXT_PUBLIC_OPENWEATHER_API_KEY</span> to see weather
        </p>
      </div>
    )
  }

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
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-center min-h-[140px]">
        <p className="text-sm text-gray-400">Weather unavailable</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      {/* City + icon row */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {weather.city}, {weather.country}
          </p>
        </div>
        <span className="text-4xl leading-none">{getWeatherEmoji(weather.icon)}</span>
      </div>

      {/* Temperature */}
      <div className="flex items-end gap-1 mb-1">
        <span className="text-5xl font-bold text-teal-500">{weather.temp}</span>
        <span className="text-2xl font-semibold text-gray-400 mb-1">°F</span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 capitalize mb-3">{weather.description}</p>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span>💧</span>
          <span>{weather.humidity}% humidity</span>
        </span>
        <span className="flex items-center gap-1">
          <span>💨</span>
          <span>{weather.wind_speed} mph</span>
        </span>
        <span className="flex items-center gap-1">
          <span>🌡️</span>
          <span>Feels {weather.feels_like}°</span>
        </span>
      </div>
    </div>
  )
}
