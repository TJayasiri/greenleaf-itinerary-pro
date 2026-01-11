// File: app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase, type Itinerary } from '@/lib/supabase'
import Link from 'next/link'
import { Search, Plane, Lock, Printer, ArrowLeft, Calendar as CalendarIcon, MapPin, Building2, FileText, Download, Users, Phone, Target, Factory, Clock } from 'lucide-react'

// Premium travel images
const TRAVEL_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80", // Plane wing
  "https://images.unsplash.com/photo-1583742931005-3e7e98312b15?w=1200&q=80", // Business class
  "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80", // Private jet
  "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1200&q=80", // Airport terminal
]

export default function HomePage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [error, setError] = useState('')
  const [bgImage] = useState(() => TRAVEL_IMAGES[Math.floor(Math.random() * TRAVEL_IMAGES.length)])

  // Auto-lookup from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeFromUrl = urlParams.get('code')
    if (codeFromUrl) {
      setCode(codeFromUrl.toUpperCase())
      performLookup(codeFromUrl.toUpperCase())
    }
  }, [])

  async function performLookup(searchCode: string) {
    if (!searchCode.trim()) return
    setLoading(true)
    setError('')
    setItinerary(null)
    try {
      const { data, error: err } = await supabase
        .from('itineraries')
        .select('*')
        .eq('code', searchCode.toUpperCase().trim())
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

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    performLookup(code)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Print Styles */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 15mm;
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
          .print\\:break-inside-avoid { break-inside: avoid !important; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl print:hide">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#62BBC1] to-[#51aab0] rounded-xl flex items-center justify-center shadow-lg">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Greenleaf Itinerary</h1>
                <p className="text-sm text-white/70">Professional Travel Management</p>
              </div>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition"
            >
              <Lock className="w-4 h-4" />
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!itinerary ? (
          <div className="relative overflow-hidden rounded-3xl shadow-2xl print:no-shadow print:no-rounded">
            {/* Background Image Layer */}
            <div className="absolute inset-0">
              <img 
                src={bgImage}
                alt="Travel"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/80 to-slate-900/85 backdrop-blur-[2px]"></div>
            </div>

            {/* Content Layer */}
            <div className="relative p-6 sm:p-12 md:p-16">
              <div className="text-center mb-8 sm:mb-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#62BBC1] to-[#51aab0] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl">
                  <Search className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3">Retrieve Your Itinerary</h2>
                <p className="text-base sm:text-lg text-white/80 px-4">
                  Enter your itinerary code to access travel details, bookings, and documents
                </p>
              </div>

              <form onSubmit={handleLookup} className="max-w-lg mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="IT-2025-ABC123"
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 text-base sm:text-lg font-mono bg-white/95 backdrop-blur-sm border-2 border-white/20 rounded-xl sm:rounded-2xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/30 focus:outline-none transition-all pr-28 sm:pr-32 shadow-xl"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="absolute right-2 top-2 px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2 font-medium text-sm sm:text-base"
                  >
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">{loading ? 'Searching...' : 'Search'}</span>
                    <span className="sm:hidden">{loading ? '...' : 'Go'}</span>
                  </button>
                </div>

                {error && (
                  <div className="mt-5 p-5 bg-red-500/90 backdrop-blur-sm border-2 border-red-400/50 rounded-xl text-white flex items-start gap-3 shadow-xl">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <span className="font-medium">{error}</span>
                  </div>
                )}
              </form>

              <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-white/20 text-center">
                <p className="text-sm sm:text-base text-white/90 font-medium mb-2">Your itinerary code was sent via email</p>
                <p className="text-xs sm:text-sm text-white/70 px-4">
                  Format: <span className="font-mono bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-1 rounded border border-white/20">IT-YYYY-XXXXXX</span>
                </p>
              </div>
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

  const flights = (itinerary as any).flights || []
  const visits = (itinerary as any).visits || []
  const accommodation = (itinerary as any).accommodation || []
  const transport = (itinerary as any).transport || []
  const travelDocs = (itinerary as any).travel_docs || {}

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between print:hide">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#62BBC1] hover:text-[#51aab0] font-medium transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to search
        </button>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
          <button
            onClick={exportICS}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            <Download className="w-4 h-4" />
            Export .ICS
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:no-shadow print:no-rounded">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 print:break-inside-avoid">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{itinerary.doc_title || 'Travel Itinerary'}</h2>
              {itinerary.trip_tag && (
                <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-sm font-medium">
                  {itinerary.trip_tag}
                </span>
              )}
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm text-white/60 mb-1">Itinerary Code</div>
              <div className="text-xl sm:text-2xl font-mono font-bold bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl break-all">
                {itinerary.code}
              </div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="p-8 border-b border-slate-200 print:break-inside-avoid">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            Travel Overview
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoCard icon={Users} iconColor="from-blue-500 to-blue-600" label="Travelers" value={itinerary.participants} />
            <InfoCard icon={Phone} iconColor="from-green-500 to-green-600" label="Contact Numbers" value={itinerary.phones} />
            <InfoCard icon={Target} iconColor="from-purple-500 to-purple-600" label="Purpose" value={itinerary.purpose} />
            <InfoCard icon={Factory} iconColor="from-orange-500 to-orange-600" label="Factory/Sites" value={itinerary.factory} />
            <InfoCard 
              icon={CalendarIcon}
              iconColor="from-red-500 to-red-600"
              label="Travel Dates" 
              value={`${new Date(itinerary.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(itinerary.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`} 
            />
          </div>
        </div>

        {/* Flights */}
        {flights.length > 0 && (
          <div className="p-6 sm:p-8 border-b border-slate-200 print:break-inside-avoid">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Plane className="w-4 h-4 text-white" />
              </div>
              Flight Schedule
            </h3>
            <div className="space-y-4">
              {flights.map((flight: any, i: number) => (
                <div key={i} className="p-5 sm:p-6 bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-100 rounded-2xl hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-base sm:text-lg font-bold text-slate-900 mb-1 break-words">
                        {flight.airline || 'Airline'} • Flight {flight.flight}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-600">
                        <span className="font-semibold">{flight.from}</span>
                        <span className="text-sky-500">→</span>
                        <span className="font-semibold">{flight.to}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm text-slate-500 mb-1">
                        {new Date(flight.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="font-mono font-semibold text-slate-900 text-sm sm:text-base">
                        {flight.dep} → {flight.arr}
                      </div>
                    </div>
                  </div>
                  {(flight.pnr || flight.eticket) && (
                    <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 border-t border-sky-200">
                      {flight.pnr && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-sky-200">
                          <span className="text-xs font-semibold text-slate-500">PNR:</span>
                          <span className="font-mono text-xs sm:text-sm font-bold text-sky-600 break-all">{flight.pnr}</span>
                        </div>
                      )}
                      {flight.eticket && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-sky-200">
                          <span className="text-xs font-semibold text-slate-500">E-ticket:</span>
                          <span className="font-mono text-xs sm:text-sm font-bold text-sky-600 break-all">{flight.eticket}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accommodation */}
        {accommodation.length > 0 && (
          <div className="p-6 sm:p-8 border-b border-slate-200 print:break-inside-avoid">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              Accommodation
            </h3>
            <div className="space-y-4">
              {accommodation.map((hotel: any, i: number) => (
                <div key={i} className="p-5 sm:p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-100 rounded-2xl hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-slate-900 mb-2 break-words">{hotel.hotel_name}</h4>
                      {hotel.address && (
                        <div className="flex items-start gap-2 text-sm text-slate-600 mb-2">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{hotel.address}</span>
                        </div>
                      )}
                      {hotel.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{hotel.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="inline-block sm:block">
                        <div className="text-xs font-semibold text-slate-500 mb-1">Check-in</div>
                        <div className="font-semibold text-slate-900 mb-2 sm:mb-3">
                          {new Date(hotel.checkin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">Check-out</div>
                        <div className="font-semibold text-slate-900">
                          {new Date(hotel.checkout).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                  {hotel.confirmation && (
                    <div className="pt-3 border-t border-amber-200">
                      <span className="text-xs font-semibold text-slate-500">Confirmation: </span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-amber-600 break-all">{hotel.confirmation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Site Visits */}
        {visits.length > 0 && (
          <div className="p-6 sm:p-8 border-b border-slate-200 print:break-inside-avoid">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              Site Visits
            </h3>
            <div className="space-y-4">
              {visits.map((visit: any, i: number) => (
                <div key={i} className="p-5 sm:p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-100 rounded-2xl hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1 break-words">{visit.facility}</h4>
                      <p className="text-sm text-emerald-700 font-medium mb-2">{visit.activity}</p>
                      {visit.address && (
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{visit.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-semibold text-slate-900">
                        {new Date(visit.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  {visit.transport && (
                    <div className="pt-3 border-t border-emerald-200">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm border border-emerald-200">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <span className="font-medium text-slate-700">{visit.transport}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ground Transport */}
        {transport.length > 0 && (
          <div className="p-8 border-b border-slate-200 print:break-inside-avoid">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              Ground Transportation
            </h3>
            <div className="space-y-4">
              {transport.map((item: any, i: number) => (
                <div key={i} className="p-5 sm:p-6 bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-100 rounded-2xl hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span className="px-3 py-1.5 bg-violet-200 text-violet-900 rounded-lg text-xs sm:text-sm font-bold">
                          {item.type}
                        </span>
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 break-words">{item.company}</h4>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{item.pickup_location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>{item.pickup_time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {item.confirmation && (
                    <div className="pt-3 border-t border-violet-200 mb-2">
                      <span className="text-xs font-semibold text-slate-500">Confirmation: </span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-violet-600 break-all">{item.confirmation}</span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="flex items-start gap-2 text-sm text-slate-600 italic bg-white p-3 rounded-lg border border-violet-100">
                      <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-500" />
                      <span className="break-words">{item.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Travel Documents */}
        {(travelDocs.visa_number || travelDocs.insurance_policy) && (
          <div className="p-6 sm:p-8 border-b border-slate-200 print:break-inside-avoid">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              Travel Documents
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {travelDocs.visa_number && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Visa Number</div>
                  <div className="font-mono font-bold text-slate-900 text-sm sm:text-base break-all">{travelDocs.visa_number}</div>
                  {travelDocs.visa_expiry && (
                    <div className="text-xs text-slate-600 mt-2">
                      Expires: {new Date(travelDocs.visa_expiry).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
              {travelDocs.insurance_policy && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Insurance Policy</div>
                  <div className="font-mono font-bold text-slate-900 text-sm sm:text-base break-all">{travelDocs.insurance_policy}</div>
                  {travelDocs.insurance_provider && (
                    <div className="text-xs text-slate-600 mt-2">{travelDocs.insurance_provider}</div>
                  )}
                </div>
              )}
              {travelDocs.emergency_contact && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-xl">
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Emergency Contact</div>
                  <div className="font-semibold text-slate-900 text-sm sm:text-base break-all">{travelDocs.emergency_contact}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attached Documents */}
        {documents.length > 0 && (
          <div className="p-6 sm:p-8 print:break-inside-avoid">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              Attached Documents
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {documents.map((doc) => {
                const publicUrl = supabase.storage.from('itinerary-docs').getPublicUrl(doc.file_path).data.publicUrl
                return (
                  <a
                    key={doc.id}
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl hover:shadow-lg hover:scale-105 transition group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate mb-1 text-sm sm:text-base">{doc.file_name}</div>
                      <div className="text-xs text-slate-500 capitalize">
                        {doc.file_type} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-slate-400 group-hover:text-[#62BBC1] transition flex-shrink-0" />
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-5 sm:p-6 text-center border-t">
          <p className="text-sm text-slate-600">
            This itinerary was prepared by <span className="font-bold text-slate-900">Greenleaf Assurance</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">For questions or changes, contact your travel coordinator</p>
        </div>
      </div>
    </div>
  )
}

/* -------- Helper Components -------- */

function InfoCard({ icon: Icon, iconColor, label, value }: { icon: any; iconColor: string; label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="p-5 bg-white border-2 border-slate-200 rounded-xl hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 bg-gradient-to-br ${iconColor} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</div>
          <div className="font-semibold text-slate-900 text-base leading-tight break-words">{value}</div>
        </div>
      </div>
    </div>
  )
}

/* -------- ICS Export Helper -------- */

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

  // Add flights
  const flights = Array.isArray((itin as any).flights) ? (itin as any).flights : []
  flights.forEach((f: any) => {
    const date = new Date(f.date)
    const [dh = 0, dm = 0] = String(f.dep || '00:00').split(':').map(Number)
    const [ah = 0, am = 0] = String(f.arr || '00:00').split(':').map(Number)
    const dep = new Date(date); dep.setHours(dh, dm, 0, 0)
    const arr = new Date(date); arr.setHours(ah, am, 0, 0)
    
    let desc = `${f.airline || 'Flight'} ${f.flight}`
    if (f.pnr) desc += ` | PNR: ${f.pnr}`
    if (f.eticket) desc += ` | E-ticket: ${f.eticket}`
    
    pushEvent(`Flight ${f.flight}: ${f.from} → ${f.to}`, dep, arr, desc, `${f.from} Airport`)
  })

  // Add visits
  const visits = Array.isArray((itin as any).visits) ? (itin as any).visits : []
  visits.forEach((v: any) => {
    const d = new Date(v.date)
    const start = new Date(d); start.setHours(9, 0, 0, 0)
    const end = new Date(d); end.setHours(17, 0, 0, 0)
    pushEvent(`Visit: ${v.facility}`, start, end, v.activity || '', v.address || '')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}