import { WeatherData } from '@/lib/types'

const CACHE_KEY = 'weather_cache'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

interface WeatherCache {
  data: WeatherData
  timestamp: number
}

export async function fetchWeather(city: string = 'New York'): Promise<WeatherData | null> {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp }: WeatherCache = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION) return data
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`
    )
    if (!res.ok) return null
    const json = await res.json()

    const data: WeatherData = {
      temp: Math.round(json.main.temp),
      feels_like: Math.round(json.main.feels_like),
      humidity: json.main.humidity,
      wind_speed: Math.round(json.wind.speed),
      description: json.weather[0].description,
      icon: json.weather[0].icon,
      city: json.name,
      country: json.sys.country,
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
    }

    return data
  } catch {
    return null
  }
}
