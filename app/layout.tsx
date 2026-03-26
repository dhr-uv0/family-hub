import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Family Hub',
  description: 'Smart home command center for your family',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Family Hub',
    startupImage: '/icons/icon-512x512.svg',
  },
  icons: {
    apple: [
      { url: '/icons/icon-152x152.svg', sizes: '152x152' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192' },
    ],
    icon: [
      { url: '/icons/icon-192x192.svg', sizes: '192x192' },
      { url: '/icons/icon-512x512.svg', sizes: '512x512' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#14b8a6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  )
}
