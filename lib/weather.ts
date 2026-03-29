import { WeatherData } from '@/lib/types'

const CACHE_KEY = 'weather_cache'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

interface WeatherCache {
  data: WeatherData
  timestamp: number
  city: string
}

// WMO weather code → emoji + description
function wmoToEmoji(code: number): { emoji: string; description: string } {
  if (code === 0) return { emoji: '☀️', description: 'clear sky' }
  if (code <= 2) return { emoji: '⛅', description: 'partly cloudy' }
  if (code === 3) return { emoji: '☁️', description: 'overcast' }
  if (code <= 48) return { emoji: '🌫️', description: 'foggy' }
  if (code <= 55) return { emoji: '🌦️', description: 'drizzle' }
  if (code <= 65) return { emoji: '🌧️', description: 'rain' }
  if (code <= 77) return { emoji: '❄️', description: 'snow' }
  if (code <= 82) return { emoji: '🌦️', description: 'rain showers' }
  if (code <= 86) return { emoji: '🌨️', description: 'snow showers' }
  if (code >= 95) return { emoji: '⛈️', description: 'thunderstorm' }
  return { emoji: '🌡️', description: 'unknown' }
}

export interface GeoResult {
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
}

export async function searchCities(query: string): Promise<GeoResult[]> {
  if (!query || query.length < 2) return []
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
    )
    if (!res.ok) return []
    const json = await res.json()
    return (json.results ?? []).map((r: any) => ({
      name: r.name,
      country: r.country ?? '',
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    }))
  } catch {
    return []
  }
}

export async function fetchWeather(city?: string): Promise<WeatherData | null> {
  const cityName = city ?? (typeof window !== 'undefined' ? localStorage.getItem('weatherCity') ?? '' : '')

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp, city: cachedCity }: WeatherCache = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION && cachedCity === cityName) return data
    }
  }

  if (!cityName) return null

  try {
    // Step 1: geocode the city
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    )
    if (!geoRes.ok) return null
    const geoJson = await geoRes.json()
    const place = geoJson.results?.[0]
    if (!place) return null

    // Step 2: fetch weather
    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,windspeed_10m` +
      `&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`
    )
    if (!wxRes.ok) return null
    const wxJson = await wxRes.json()
    const cur = wxJson.current

    const { emoji, description } = wmoToEmoji(cur.weathercode)

    const data: WeatherData = {
      temp: Math.round(cur.temperature_2m),
      feels_like: Math.round(cur.apparent_temperature),
      humidity: Math.round(cur.relative_humidity_2m),
      wind_speed: Math.round(cur.windspeed_10m),
      description,
      icon: emoji,
      city: place.name,
      country: place.country_code?.toUpperCase() ?? place.country ?? '',
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now(), city: cityName }))
    }

    return data
  } catch {
    return null
  }
}
