'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import type { CarouselPhoto } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  X,
  ZoomIn,
  Pause,
  Play,
} from 'lucide-react'
import { format } from 'date-fns'

const CAROUSEL_INTERVAL = 30000

export default function PhotosPage() {
  const [photos, setPhotos] = useState<CarouselPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [pendingCaption, setPendingCaption] = useState('')
  const [pendingFilePath, setPendingFilePath] = useState('')
  const [savingCaption, setSavingCaption] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPhotos = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('carousel_photos')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      setPhotos(data ?? [])
    } catch (err) {
      console.error(err)
      setError('Failed to load photos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])
  useRealtimeSubscription('carousel_photos', fetchPhotos)

  // Auto-rotate carousel
  useEffect(() => {
    if (isPaused || photos.length <= 1) return
    intervalRef.current = setInterval(() => {
      goToNext()
    }, CAROUSEL_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPaused, photos.length, currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const goToIndex = (idx: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(idx)
      setIsTransitioning(false)
    }, 300)
  }

  const goToPrev = () => {
    if (photos.length === 0) return
    goToIndex((currentIndex - 1 + photos.length) % photos.length)
  }

  const goToNext = () => {
    if (photos.length === 0) return
    goToIndex((currentIndex + 1) % photos.length)
  }

  const getPhotoUrl = (filePath: string) => {
    const supabase = createClient()
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `uploads/${fileName}`

      // Simulate progress since Supabase upload doesn't expose progress
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 20, 80))
      }, 200)

      const { error: uploadErr } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { contentType: file.type })

      clearInterval(progressInterval)

      if (uploadErr) throw uploadErr

      setUploadProgress(100)
      setPendingFilePath(filePath)
      setUploadDialogOpen(false)
      setCaptionDialogOpen(true)
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveCaption = async () => {
    if (!pendingFilePath) return
    setSavingCaption(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('carousel_photos').insert({
        file_path: pendingFilePath,
        caption: pendingCaption.trim() || null,
        taken_date: new Date().toISOString().split('T')[0],
        uploaded_by: user?.id ?? null,
      })
      if (error) throw error

      setPendingCaption('')
      setPendingFilePath('')
      setCaptionDialogOpen(false)
      fetchPhotos()
    } catch (err) {
      console.error(err)
    } finally {
      setSavingCaption(false)
    }
  }

  const handleDeletePhoto = async (photo: CarouselPhoto) => {
    if (!confirm('Delete this photo?')) return
    const supabase = createClient()
    await Promise.all([
      supabase.storage.from('photos').remove([photo.file_path]),
      supabase.from('carousel_photos').delete().eq('id', photo.id),
    ])
    fetchPhotos()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <Button onClick={fetchPhotos} variant="outline">Retry</Button>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Photos</h1>
            <p className="text-sm text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button
          onClick={() => setUploadDialogOpen(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white min-h-[44px] gap-2"
        >
          <Upload className="w-4 h-4" /> Upload Photo
        </Button>
      </div>

      {/* Carousel */}
      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">No photos yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Upload your first family photo</p>
          <Button onClick={() => setUploadDialogOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white">
            <Upload className="w-4 h-4 mr-2" /> Upload Photo
          </Button>
        </div>
      ) : (
        <div
          className="relative bg-black rounded-2xl overflow-hidden shadow-lg"
          style={{ aspectRatio: '16/7' }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Photo */}
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              isTransitioning ? 'opacity-0' : 'opacity-100'
            )}
          >
            {currentPhoto && (
              <img
                src={getPhotoUrl(currentPhoto.file_path)}
                alt={currentPhoto.caption ?? 'Family photo'}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYyOTM3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM0YjU1NjMiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QaG90byBub3QgZm91bmQ8L3RleHQ+PC9zdmc+' }}
              />
            )}
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Caption and date */}
          {currentPhoto && (
            <div className="absolute bottom-12 left-0 right-0 px-6">
              {currentPhoto.caption && (
                <p className="text-white font-medium text-lg drop-shadow-lg">{currentPhoto.caption}</p>
              )}
              <p className="text-white/70 text-sm mt-1">
                {format(new Date(currentPhoto.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          {/* Navigation dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => goToIndex(i)}
                className={cn(
                  'rounded-full transition-all',
                  i === currentIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                )}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>

          {/* Prev/Next buttons */}
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Pause/Play button */}
          <button
            onClick={() => setIsPaused(p => !p)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
            title={isPaused ? 'Resume slideshow' : 'Pause slideshow'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Photo count */}
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/30 text-white text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">All Photos</h2>
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className="break-inside-avoid rounded-xl overflow-hidden relative group cursor-pointer bg-gray-100"
                onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
              >
                <img
                  src={getPhotoUrl(photo.file_path)}
                  alt={photo.caption ?? 'Family photo'}
                  className="w-full object-cover"
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+' }}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                  <div className="w-full px-3 pb-3 pt-8 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.caption && (
                      <p className="text-white text-xs font-medium line-clamp-2">{photo.caption}</p>
                    )}
                    <p className="text-white/70 text-xs mt-0.5">{format(new Date(photo.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); setLightboxIndex(i); setLightboxOpen(true) }}
                    className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white"
                    title="View full size"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeletePhoto(photo) }}
                    className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white"
                    title="Delete photo"
                  >
                    <Trash2Icon className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={v => { if (!uploading) setUploadDialogOpen(v) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-teal-500" />
              Upload Photo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">Uploading... {uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Click to select image</p>
                  <p className="text-gray-400 text-sm mt-1">JPG, PNG, GIF up to 10MB</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} className="w-full" disabled={uploading}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Caption Dialog */}
      <Dialog open={captionDialogOpen} onOpenChange={v => { if (!savingCaption) setCaptionDialogOpen(v) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Caption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-500">Photo uploaded successfully. Add an optional caption.</p>
            <div>
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={pendingCaption}
                onChange={e => setPendingCaption(e.target.value)}
                placeholder="e.g. Summer vacation 2025"
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setPendingCaption(''); setPendingFilePath(''); setCaptionDialogOpen(false); fetchPhotos() }}
                className="flex-1"
                disabled={savingCaption}
              >
                Skip
              </Button>
              <Button
                onClick={handleSaveCaption}
                disabled={savingCaption}
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
              >
                {savingCaption ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 bg-black border-0 overflow-hidden">
          <div className="relative" style={{ aspectRatio: '16/10' }}>
            {photos[lightboxIndex] && (
              <img
                src={getPhotoUrl(photos[lightboxIndex].file_path)}
                alt={photos[lightboxIndex].caption ?? 'Photo'}
                className="w-full h-full object-contain"
              />
            )}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIndex(i => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/75 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setLightboxIndex(i => (i + 1) % photos.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/75 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            {photos[lightboxIndex] && (
              <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/70 to-transparent">
                {photos[lightboxIndex].caption && (
                  <p className="text-white font-medium">{photos[lightboxIndex].caption}</p>
                )}
                <p className="text-white/60 text-sm mt-0.5">
                  {format(new Date(photos[lightboxIndex].created_at), 'MMMM d, yyyy')}
                  {' · '}{lightboxIndex + 1} of {photos.length}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Inline Trash2 icon to avoid import conflict
function Trash2Icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}
