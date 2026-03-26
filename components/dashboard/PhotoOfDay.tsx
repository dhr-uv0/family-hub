'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { CarouselPhoto } from '@/lib/types'

export default function PhotoOfDay() {
  const [photo, setPhoto] = useState<CarouselPhoto | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const fetchPhoto = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('carousel_photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data && data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length)
      setPhoto(data[randomIndex] as CarouselPhoto)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPhoto()
  }, [fetchPhoto])

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const photoUrl = photo && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/photos/${photo.file_path}`
    : null

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="aspect-video bg-gray-200 animate-pulse" />
        <div className="p-3">
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!photo || !photoUrl || imageError) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-teal-50 to-teal-100 flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">📷</span>
          <p className="text-sm font-medium text-teal-700">Upload your first photo</p>
          <p className="text-xs text-teal-500">Share memories with your family</p>
        </div>
      </div>
    )
  }

  const takenDate = photo.taken_date
    ? new Date(photo.taken_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        <Image
          src={photoUrl}
          alt={photo.caption ?? 'Family photo'}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>
      {(photo.caption || takenDate) && (
        <div className="px-4 py-3">
          {photo.caption && (
            <p className="text-sm font-medium text-gray-700">{photo.caption}</p>
          )}
          {takenDate && (
            <p className="text-xs text-gray-400 mt-0.5">{takenDate}</p>
          )}
        </div>
      )}
    </div>
  )
}
