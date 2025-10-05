'use client'

import { useState } from 'react'
import { supabase, type Itinerary } from '@/lib/supabase'
import Link from 'next/link'
import { Search, Plane, Lock } from 'lucide-react'

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
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
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
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Retrieve Your Itinerary
              </h2>
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

  // Load documents
  useState(() => {
    supabase
      .from('documents')
      .select('*')
      .eq('itinerary_id', itinerary.id)
      .then(({ data }) => setDocuments(data || []))
  })

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-[#62BBC1] hover:underline flex items-center gap-2"
      >
        ← Back to search
      </button>

      {/* Add this after the back button */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="text-[#62BBC1] hover:underline flex items-center gap-2"
        >
          ← Back to search
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition no-print"
        >
          Print Itinerary
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{itinerary.doc_title || 'Travel Itinerary'}</h2>
              <p className="text-slate-300 mt-1">{itinerary.trip_tag}</p>
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
            <div>
              <label className="text-sm text-slate-600">Travelers</label>
              <p className="font-medium">{itinerary.participants}</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Contact Numbers</label>
              <p className="font-medium">{itinerary.phones}</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Purpose</label>
              <p className="font-medium">{itinerary.purpose}</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Travel Dates</label>
              <p className="font-medium">
                {new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Flights */}
        {itinerary.flights && itinerary.flights.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="font-bold text-lg mb-4">Flight Schedule</h3>
            <div className="space-y-3">
              {itinerary.flights.map((flight: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="font-bold text-[#62BBC1]">{flight.flight}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{flight.from}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-medium">{flight.to}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(flight.date).toLocaleDateString()} • Dep: {flight.dep} → Arr: {flight.arr}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visits */}
        {itinerary.visits && itinerary.visits.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="font-bold text-lg mb-4">Site Visits</h3>
            <div className="space-y-3">
              {itinerary.visits.map((visit: any, i: number) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold">{visit.facility}</div>
                    <div className="text-sm text-slate-600">{new Date(visit.date).toLocaleDateString()}</div>
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
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={supabase.storage.from('itinerary-docs').getPublicUrl(doc.file_path).data.publicUrl}
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}