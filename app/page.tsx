// file: app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase, type Itinerary } from '@/lib/supabase'
import Link from 'next/link'
import { Search, Plane, Lock, Printer, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react'

export default function HomePage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [error, setError] = useState('')

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setItinerary(null)
    try {
      const { data, error: err } = await supabase
        .from('itineraries')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .single()

      if (err || !data) {
        setError('Itinerary not found. Please check the code and try again.')
        return
      }
      setItinerary(data)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* PRINT FIX: Global print rules kept inline to avoid touching other files */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          html, body {
            width: 210mm !important;
            margin: 0 auto !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hide { display: none !important; }
          .print\\:no-shadow { box-shadow: none !important; }
          .print\\:no-rounded { border-radius: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b shadow-sm print:hide">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Plane className="w-8 h-8 text-[#62BBC1]" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Greenleaf Itinerary</h1>
              <p className="text-xs text-slate-500">Travel Management System</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            <Lock className="w-4 h-4" />
            Staff Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        {!itinerary ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 print:no-shadow print:no-rounded">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Retrieve Your Itinerary</h2>
              <p className="text-slate-600">
                Enter your itinerary code to view travel details, bookings, and documents
              </p>
            </div>

            <form onSubmit={handleLookup} className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="IT-2025-ABC123"
                  className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:outline-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="absolute right-2 top-2 px-6 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </form>

            <div className="mt-12 pt-8 border-t text-center text-sm text-slate-500">
              <p>Your itinerary code was sent to you via email</p>
              <p className="mt-2">Format: IT-YYYY-XXXXXX (e.g., IT-2025-A7X9B2)</p>
            </div>
          </div>
        ) : (
          <ItineraryView itinerary={itinerary} onBack={() => setItinerary(null)} />
        )}
      </main>
    </div>
  )
}

function ItineraryView({ itinerary, onBack }: { itinerary: Itinerary; onBack: () => void }) {
  const [documents, setDocuments] = useState<any[]>([])

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('itinerary_id', itinerary.id)
      if (isMounted) setDocuments(data || [])
    })()
    return () => { isMounted = false }
  }, [itinerary.id])

  // --- ICS EXPORT (TripIt/Calendar friendly) ---
  function exportICS() {
    const ics = buildICS(itinerary)
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${itinerary.code}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Action bar — single row, right-aligned CTAs, hidden on print */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hide">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#62BBC1] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to search
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            title="Print (A4-scaled)"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <button
            onClick={exportICS}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] transition"
            title="Export calendar (.ics)"
          >
            <CalendarIcon className="w-4 h-4" />
            Export .ICS
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:no-shadow print:no-rounded">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{itinerary.doc_title || 'Travel Itinerary'}</h2>
              {itinerary.trip_tag && <p className="text-slate-300 mt-1">{itinerary.trip_tag}</p>}
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Itinerary Code</div>
              <div className="text-xl font-mono font-bold">{itinerary.code}</div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="p-6 border-b">
          <h3 className="font-bold text-lg mb-4">Travel Overview</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Info label="Travelers" value={itinerary.participants} />
            <Info label="Contact Numbers" value={itinerary.phones} />
            <Info label="Purpose" value={itinerary.purpose} />
            <Info
              label="Travel Dates"
              value={`${new Date(itinerary.start_date).toLocaleDateString()} - ${new Date(
                itinerary.end_date
              ).toLocaleDateString()}`}
            />
          </div>
        </div>

        {/* Flights */}
        {Array.isArray((itinerary as any).flights) && (itinerary as any).flights.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="font-bold text-lg mb-4">Flight Schedule</h3>
            <div className="space-y-3">
              {(itinerary as any).flights.map((flight: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="font-bold text-[#62BBC1]">{flight.flight}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{flight.from}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium">{flight.to}</span>
                    </div>
                    <div className="text-sm text-slate-200 sm:text-slate-600">
                      {new Date(flight.date).toLocaleDateString()} • Dep: {flight.dep} → Arr: {flight.arr}
                    </div>
                  </div>
                  {flight.booking_ref && (
                    <div className="text-xs text-slate-500">PNR: {flight.booking_ref}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visits */}
        {Array.isArray((itinerary as any).visits) && (itinerary as any).visits.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="font-bold text-lg mb-4">Site Visits</h3>
            <div className="space-y-3">
              {(itinerary as any).visits.map((visit: any, i: number) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold">{visit.facility}</div>
                    <div className="text-sm text-slate-600">
                      {new Date(visit.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 mb-1">{visit.activity}</div>
                  <div className="text-sm text-slate-500">{visit.address}</div>
                  {visit.transport && (
                    <div className="mt-2 inline-block px-3 py-1 bg-white rounded-full text-xs">
                      🚗 {visit.transport}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div className="p-6">
            <h3 className="font-bold text-lg mb-4">Attached Documents</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {documents.map((doc) => {
                const publicUrl =
                  supabase.storage.from('itinerary-docs').getPublicUrl(doc.file_path).data.publicUrl
                return (
                  <a
                    key={doc.id}
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center text-red-600 font-bold">
                      PDF
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.file_name}</div>
                      <div className="text-xs text-slate-500 capitalize">{doc.file_type}</div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* -------- Helpers -------- */

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function buildICS(itin: Itinerary & { flights?: any[]; visits?: any[] }) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const toICSDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Greenleaf Itinerary//EN']

  const pushEvent = (summary: string, start: Date, end: Date, desc?: string, loc?: string) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${crypto.randomUUID()}@greenleaf`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${(summary || '').replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(desc || '').replace(/\n/g, ' ')}`,
      `LOCATION:${(loc || '').replace(/\n/g, ' ')}`,
      'END:VEVENT'
    )
  }

  // Flights
  const flights = Array.isArray((itin as any).flights) ? (itin as any).flights : []
  flights.forEach((f: any) => {
    const date = new Date(f.date)
    const [dh = 0, dm = 0] = String(f.dep || '00:00').split(':').map(Number)
    const [ah = 0, am = 0] = String(f.arr || '00:00').split(':').map(Number)
    const dep = new Date(date); dep.setHours(dh, dm, 0, 0)
    const arr = new Date(date); arr.setHours(ah, am, 0, 0)
    pushEvent(`Flight ${f.flight}: ${f.from} → ${f.to}`, dep, arr, f.booking_ref ? `PNR: ${f.booking_ref}` : '', `${f.from} Airport`)
  })

  // Visits
  const visits = Array.isArray((itin as any).visits) ? (itin as any).visits : []
  visits.forEach((v: any) => {
    const d = new Date(v.date)
    const start = new Date(d); start.setHours(9, 0, 0, 0)
    const end = new Date(d);   end.setHours(17, 0, 0, 0)
    pushEvent(`Visit: ${v.facility}`, start, end, v.activity || '', v.address || '')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}