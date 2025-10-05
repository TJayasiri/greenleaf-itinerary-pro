// File: app/layout.tsx

import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Greenleaf Itinerary Pro',
  description: 'Travel itinerary management system for Greenleaf Assurance',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}