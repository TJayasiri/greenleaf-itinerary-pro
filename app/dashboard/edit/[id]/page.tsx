// File: app/dashboard/edit/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, type Itinerary } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Save, ArrowLeft, Send, Upload, Trash2, Plus, Link as LinkIcon, Printer, Mail, X, Check, Download } from 'lucide-react'

export default function EditItineraryPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [user, setUser] = useState<any>(null)
  const [itinerary, setItinerary] = useState<Partial<Itinerary> | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    checkAuth()
    if (id) {
      loadItinerary()
      loadDocuments()
    }
  }, [id])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !itinerary) return
    
    const timer = setTimeout(() => {
      handleSave(true) // silent save
    }, 5000) // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(timer)
  }, [itinerary, autoSaveEnabled])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
  }

  async function loadItinerary() {
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Load error:', error)
      toast('Failed to load itinerary', 'error')
      return
    }

    setItinerary({
      ...data,
      flights: data?.flights ?? [],
      visits: data?.visits ?? [],
      accommodation: data?.accommodation ?? [],
      transport: data?.transport ?? [],
      travel_docs: data?.travel_docs ?? {},
    })
    setLoading(false)
  }

  async function loadDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('itinerary_id', id)

    if (error) {
      console.error('Document load error:', error)
      return
    }

    setDocuments(data || [])
  }

  async function handleSave(silent = false) {
    if (!itinerary || !id) return
    setSaving(true)

    try {
      const payload = {
        doc_title: itinerary.doc_title ?? null,
        trip_tag: itinerary.trip_tag ?? null,
        participants: itinerary.participants ?? null,
        phones: itinerary.phones ?? null,
        purpose: itinerary.purpose ?? null,
        factory: itinerary.factory ?? null,
        start_date: itinerary.start_date ?? null,
        end_date: itinerary.end_date ?? null,
        flights: (itinerary as any).flights ?? [],
        visits: (itinerary as any).visits ?? [],
        accommodation: (itinerary as any).accommodation ?? [],
        transport: (itinerary as any).transport ?? [],
        travel_docs: (itinerary as any).travel_docs ?? {},
      }

      const { error } = await supabase.from('itineraries').update(payload).eq('id', id)
      if (error) throw error

      setLastSaved(new Date())
      if (!silent) toast('✓ Saved successfully!', 'success')
    } catch (err) {
      toast('✗ Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !id) return
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        const fileName = `${id}/${Date.now()}_${file.name}`

        const { error: uploadError } = await supabase.storage
          .from('itinerary-docs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('itinerary-docs')
          .getPublicUrl(fileName)

        const { error: dbError } = await supabase.from('documents').insert({
          itinerary_id: id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type || 'other',
          file_size: file.size,
          file_url: publicUrl,
        })
        if (dbError) throw dbError
      }

      await loadDocuments()
      toast('✓ Files uploaded', 'success')
    } catch (err: any) {
      toast(`✗ Upload failed: ${err?.message || 'Unknown error'}`, 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDeleteDocument(docId: string, filePath: string) {
    if (!confirm('Delete this document?')) return
    try {
      await supabase.storage.from('itinerary-docs').remove([filePath])
      await supabase.from('documents').delete().eq('id', docId)
      await loadDocuments()
      toast('✓ Document deleted', 'success')
    } catch {
      toast('✗ Failed to delete', 'error')
    }
  }

  function handlePrint() {
    window.print()
  }

  function exportToICS() {
    // Generate iCalendar format for TripIt, Google Calendar, Apple Calendar
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Greenleaf Assurance//Itinerary//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n'
    
    // Add main trip event
    if (itinerary.start_date && itinerary.end_date) {
      icsContent += 'BEGIN:VEVENT\n'
      icsContent += `UID:${itinerary.code}@greenleafassurance.com\n`
      icsContent += `DTSTART:${formatICSDate(itinerary.start_date)}\n`
      icsContent += `DTEND:${formatICSDate(itinerary.end_date)}\n`
      icsContent += `SUMMARY:${itinerary.doc_title || 'Business Trip'}\n`
      icsContent += `DESCRIPTION:${itinerary.purpose || 'Business travel'}\\nCode: ${itinerary.code}\\nParticipants: ${itinerary.participants || 'N/A'}\n`
      icsContent += 'END:VEVENT\n'
    }

    // Add flights
    const flights = (itinerary as any).flights || []
    flights.forEach((flight: any, i: number) => {
      if (flight.date && flight.dep) {
        icsContent += 'BEGIN:VEVENT\n'
        icsContent += `UID:${itinerary.code}-flight-${i}@greenleafassurance.com\n`
        icsContent += `DTSTART:${formatICSDateTime(flight.date, flight.dep)}\n`
        icsContent += `SUMMARY:Flight ${flight.flight} - ${flight.from} to ${flight.to}\n`
        icsContent += `DESCRIPTION:Flight: ${flight.flight}\\nFrom: ${flight.from}\\nTo: ${flight.to}\\nDeparture: ${flight.dep}\\nArrival: ${flight.arr}\n`
        icsContent += `LOCATION:${flight.from}\n`
        icsContent += 'END:VEVENT\n'
      }
    })

    // Add hotel check-ins
    const accommodation = (itinerary as any).accommodation || []
    accommodation.forEach((hotel: any, i: number) => {
      if (hotel.checkin && hotel.hotel_name) {
        icsContent += 'BEGIN:VEVENT\n'
        icsContent += `UID:${itinerary.code}-hotel-${i}@greenleafassurance.com\n`
        icsContent += `DTSTART:${formatICSDate(hotel.checkin)}\n`
        icsContent += `DTEND:${formatICSDate(hotel.checkout || hotel.checkin)}\n`
        icsContent += `SUMMARY:Hotel: ${hotel.hotel_name}\n`
        icsContent += `DESCRIPTION:Hotel: ${hotel.hotel_name}\\nConfirmation: ${hotel.confirmation}\\nAddress: ${hotel.address}\\nPhone: ${hotel.phone}\n`
        icsContent += `LOCATION:${hotel.address || hotel.hotel_name}\n`
        icsContent += 'END:VEVENT\n'
      }
    })

    icsContent += 'END:VCALENDAR'

    // Download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${itinerary.code || 'itinerary'}.ics`
    link.click()
    window.URL.revokeObjectURL(url)
    toast('✓ Calendar file downloaded', 'success')
  }

  function formatICSDate(dateStr: string | Date) {
    const date = new Date(dateStr)
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  function formatICSDateTime(dateStr: string, timeStr: string) {
    const date = new Date(`${dateStr}T${timeStr}:00`)
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  function exportToCSV() {
    let csv = 'Type,Date,Details,Location,Time,Notes\n'
    
    // Flights
    const flights = (itinerary as any).flights || []
    flights.forEach((f: any) => {
      csv += `Flight,${f.date},"${f.flight} - ${f.from} to ${f.to}","${f.from}",${f.dep}-${f.arr},"Departure: ${f.dep} Arrival: ${f.arr}"\n`
    })

    // Hotels
    const accommodation = (itinerary as any).accommodation || []
    accommodation.forEach((h: any) => {
      csv += `Hotel,${h.checkin},"${h.hotel_name}","${h.address}",,"Confirmation: ${h.confirmation} Phone: ${h.phone}"\n`
    })

    // Site visits
    const visits = (itinerary as any).visits || []
    visits.forEach((v: any) => {
      csv += `Site Visit,${v.date},"${v.activity} at ${v.facility}","${v.address}",,"Transport: ${v.transport}"\n`
    })

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${itinerary.code || 'itinerary'}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    toast('✓ CSV file downloaded', 'success')
  }

  if (loading || !itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#62BBC1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading itinerary...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        {/* Header - Hidden on print */}
        <header className="bg-white border-b shadow-sm sticky top-0 z-10 print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push('/dashboard')} 
                  className="text-slate-600 hover:text-slate-900 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {itinerary.doc_title || 'Edit Itinerary'}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span>Code: {itinerary.code}</span>
                    {lastSaved && (
                      <span className="text-xs">
                        • Last saved: {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] disabled:opacity-50 transition"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 print:px-8 print:py-4">
          {/* Print Header - Only visible when printing */}
          <div className="hidden print:block mb-8 border-b pb-4">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {itinerary.doc_title || 'Travel Itinerary'}
            </h1>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Code:</span> {itinerary.code}
              </div>
              <div>
                <span className="font-semibold">Participants:</span> {itinerary.participants || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Duration:</span> {itinerary.start_date} to {itinerary.end_date}
              </div>
              <div>
                <span className="font-semibold">Purpose:</span> {itinerary.purpose || 'N/A'}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <section className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none print:border-0">
            <h2 className="text-lg font-bold mb-4 print:text-xl">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <LabeledInput
                label="Document Title"
                value={itinerary.doc_title || ''}
                onChange={(v) => setItinerary({ ...itinerary, doc_title: v })}
              />
              <LabeledInput
                label="Trip Tag"
                value={itinerary.trip_tag || ''}
                onChange={(v) => setItinerary({ ...itinerary, trip_tag: v })}
              />
              <LabeledInput
                label="Participants"
                value={itinerary.participants || ''}
                onChange={(v) => setItinerary({ ...itinerary, participants: v })}
              />
              <LabeledInput
                label="Contact Phones"
                value={itinerary.phones || ''}
                onChange={(v) => setItinerary({ ...itinerary, phones: v })}
              />
              <LabeledInput
                label="Purpose"
                value={itinerary.purpose || ''}
                onChange={(v) => setItinerary({ ...itinerary, purpose: v })}
              />
              <LabeledInput
                label="Factory/Sites"
                value={itinerary.factory || ''}
                onChange={(v) => setItinerary({ ...itinerary, factory: v })}
              />
              <LabeledDate
                label="Start Date"
                value={(itinerary.start_date as string) || ''}
                onChange={(v) => setItinerary({ ...itinerary, start_date: v })}
              />
              <LabeledDate
                label="End Date"
                value={(itinerary.end_date as string) || ''}
                onChange={(v) => setItinerary({ ...itinerary, end_date: v })}
              />
            </div>
          </section>

          {/* Flights */}
          <FlightsSection
            flights={(itinerary as any).flights || []}
            onChange={(flights) => setItinerary({ ...(itinerary as any), flights })}
          />

          {/* Site Visits */}
          <VisitsSection
            visits={(itinerary as any).visits || []}
            onChange={(visits) => setItinerary({ ...(itinerary as any), visits })}
          />

          {/* Accommodation */}
          <AccommodationSection
            accommodation={(itinerary as any).accommodation || []}
            onChange={(accommodation) => setItinerary({ ...(itinerary as any), accommodation })}
          />

          {/* Ground Transport */}
          <GroundTransportSection
            transport={(itinerary as any).transport || []}
            onChange={(transport) => setItinerary({ ...(itinerary as any), transport })}
          />

          {/* Travel Docs */}
          <TravelDocsSection
            docs={(itinerary as any).travel_docs || {}}
            onChange={(travel_docs) => setItinerary({ ...(itinerary as any), travel_docs })}
          />

          {/* Documents */}
          <section className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none print:border-0 print:break-inside-avoid">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold print:text-xl">Attached Documents</h2>
              <label className="flex items-center gap-2 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] cursor-pointer transition print:hidden">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Files'}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-500 print:hidden">
                No documents uploaded yet. Add hotel bookings, tickets, etc.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 print:grid-cols-1">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg print:border-0 print:mb-2">
                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center font-semibold text-xs">
                      {doc.file_type?.includes('pdf') ? 'PDF' : 'FILE'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.file_name}</div>
                      <div className="text-xs text-slate-500">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}
                      </div>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-slate-700 hover:underline mt-1 print:text-black"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {doc.file_url}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                      className="text-red-600 hover:text-red-800 print:hidden"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <EmailModal
          itinerary={itinerary}
          itineraryId={id}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            loadItinerary()
            setShowEmailModal(false)
          }}
        />
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { 
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
          }
          input, textarea, select {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

// Email Modal Component
function EmailModal({ itinerary, itineraryId, onClose, onSuccess }: any) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!email || !itinerary?.participants) {
      toast('Please enter email and ensure participants are filled', 'error')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/send-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itineraryId, 
          email,
          customMessage: message 
        }),
      })

      if (!response.ok) throw new Error('Failed to send')

      await supabase
        .from('itineraries')
        .update({ 
          status: 'sent', 
          sent_to: email, 
          sent_at: new Date().toISOString() 
        })
        .eq('id', itineraryId)

      toast('✓ Email sent successfully!', 'success')
      onSuccess()
    } catch {
      toast('✗ Failed to send email', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Send Itinerary via Email</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-slate-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-sm mb-2">Itinerary Preview:</h3>
            <p className="text-sm text-slate-700"><strong>Title:</strong> {itinerary.doc_title || 'N/A'}</p>
            <p className="text-sm text-slate-700"><strong>Code:</strong> {itinerary.code}</p>
            <p className="text-sm text-slate-700"><strong>Travelers:</strong> {itinerary.participants || 'N/A'}</p>
            <p className="text-sm text-slate-700"><strong>Dates:</strong> {itinerary.start_date} to {itinerary.end_date}</p>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Recipient Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="traveler@example.com"
              className="w-full px-4 py-2 border rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
            />
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note..."
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:border-[#62BBC1] focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !email}
              className="flex-1 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- UI Components ---------- */

function LabeledInput({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2 print:font-semibold">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none print:border-0 print:p-0"
      />
    </div>
  )
}

function LabeledDate({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2 print:font-semibold">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none print:border-0 print:p-0"
      />
    </div>
  )
}

function FlightsSection({ flights, onChange }: any) {
  function addFlight() {
    onChange([...flights, { flight: '', date: '', from: '', to: '', dep: '', arr: '' }])
  }
  function updateFlight(index: number, field: string, value: string) {
    const updated = [...flights]
    updated[index][field] = value
    onChange(updated)
  }
  function removeFlight(index: number) {
    onChange(flights.filter((_: any, i: number) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none print:border-0 print:break-inside-avoid">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold print:text-xl">Flight Schedule</h2>
        <button
          onClick={addFlight}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition print:hidden"
        >
          <Plus className="w-4 h-4" />
          Add Flight
        </button>
      </div>

      {flights.length === 0 ? (
        <p className="text-slate-500 text-sm print:hidden">No flights added yet.</p>
      ) : (
        <div className="space-y-3">
          {flights.map((flight: any, i: number) => (
            <div key={i} className="grid grid-cols-7 gap-2 items-start p-3 bg-slate-50 rounded-lg print:bg-white print:border-b print:pb-2">
              <input
                type="text"
                placeholder="Flight No"
                value={flight.flight}
                onChange={(e) => updateFlight(i, 'flight', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0 print:font-semibold"
              />
              <input
                type="date"
                value={flight.date}
                onChange={(e) => updateFlight(i, 'date', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="text"
                placeholder="From"
                value={flight.from}
                onChange={(e) => updateFlight(i, 'from', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="text"
                placeholder="To"
                value={flight.to}
                onChange={(e) => updateFlight(i, 'to', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="time"
                value={flight.dep}
                onChange={(e) => updateFlight(i, 'dep', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="time"
                value={flight.arr}
                onChange={(e) => updateFlight(i, 'arr', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <button onClick={() => removeFlight(i)} className="text-red-600 hover:text-red-800 print:hidden">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function VisitsSection({ visits, onChange }: any) {
  function addVisit() {
    onChange([...visits, { date: '', activity: '', facility: '', address: '', transport: '' }])
  }
  function updateVisit(index: number, field: string, value: string) {
    const updated = [...visits]
    updated[index][field] = value
    onChange(updated)
  }
  function removeVisit(index: number) {
    onChange(visits.filter((_: any, i: number) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none print:border-0 print:break-inside-avoid">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold print:text-xl">Site Visits</h2>
        <button
          onClick={addVisit}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition print:hidden"
        >
          <Plus className="w-4 h-4" />
          Add Visit
        </button>
      </div>

      <div className="space-y-3">
        {visits.map((visit: any, i: number) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg print:bg-white print:border-b print:pb-3">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="date"
                value={visit.date}
                onChange={(e) => updateVisit(i, 'date', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="text"
                placeholder="Activity"
                value={visit.activity}
                onChange={(e) => updateVisit(i, 'activity', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="text"
                placeholder="Facility"
                value={visit.facility}
                onChange={(e) => updateVisit(i, 'facility', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
            </div>
            <div className="grid grid-cols-5 gap-3 items-start">
              <textarea
                placeholder="Address"
                value={visit.address}
                onChange={(e) => updateVisit(i, 'address', e.target.value)}
                className="col-span-3 px-3 py-2 border rounded text-sm print:border-0 print:p-0"
                rows={2}
              />
              <input
                type="text"
                placeholder="Transport"
                value={visit.transport}
                onChange={(e) => updateVisit(i, 'transport', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <button
                onClick={() => removeVisit(i)}
                className="text-red-600 hover:text-red-800 self-start mt-2 print:hidden"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function AccommodationSection({ accommodation, onChange }: any) {
  function addAccommodation() {
    onChange([
      ...accommodation,
      { hotel_name: '', checkin: '', checkout: '', confirmation: '', address: '', phone: '' },
    ])
  }
  function updateAccommodation(index: number, field: string, value: string) {
    const updated = [...accommodation]
    updated[index][field] = value
    onChange(updated)
  }
  function removeAccommodation(index: number) {
    onChange(accommodation.filter((_: any, i: number) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none print:border-0 print:break-inside-avoid">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold print:text-xl">Accommodation</h2>
        <button
          onClick={addAccommodation}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition print:hidden"
        >
          <Plus className="w-4 h-4" />
          Add Hotel
        </button>
      </div>

      <div className="space-y-4">
        {accommodation.map((hotel: any, i: number) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg print:bg-white print:border-b print:pb-3">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Hotel Name"
                value={hotel.hotel_name}
                onChange={(e) => updateAccommodation(i, 'hotel_name', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0 print:font-semibold"
              />
              <input
                type="text"
                placeholder="Confirmation Number"
                value={hotel.confirmation}
                onChange={(e) => updateAccommodation(i, 'confirmation', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-600 print:hidden">Check-in</label>
                <input
                  type="date"
                  value={hotel.checkin}
                  onChange={(e) => updateAccommodation(i, 'checkin', e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm print:border-0 print:p-0"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 print:hidden">Check-out</label>
                <input
                  type="date"
                  value={hotel.checkout}
                  onChange={(e) => updateAccommodation(i, 'checkout', e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm print:border-0 print:p-0"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                placeholder="Address"
                value={hotel.address}
                onChange={(e) => updateAccommodation(i, 'address', e.target.value)}
                className="col-span-2 px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={hotel.phone}
                onChange={(e) => updateAccommodation(i, 'phone', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
            </div>
            <button onClick={() => removeAccommodation(i)} className="text-red-600 hover:text-red-800 text-sm print:hidden">
              <Trash2 className="w-4 h-4 inline mr-1" />
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function GroundTransportSection({ transport, onChange }: any) {
  function addTransport() {
    onChange([
      ...transport,
      { type: '', company: '', confirmation: '', pickup_time: '', pickup_location: '', notes: '' },
    ])
  }
  function updateTransport(index: number, field: string, value: string) {
    const updated = [...transport]
    updated[index][field] = value
    onChange(updated)
  }
  function removeTransport(index: number) {
    onChange(transport.filter((_: any, i: number) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none print:border-0 print:break-inside-avoid">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold print:text-xl">Ground Transportation</h2>
        <button
          onClick={addTransport}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition print:hidden"
        >
          <Plus className="w-4 h-4" />
          Add Transport
        </button>
      </div>

      <div className="space-y-4">
        {transport.map((item: any, i: number) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg print:bg-white print:border-b print:pb-3">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <select
                value={item.type}
                onChange={(e) => updateTransport(i, 'type', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              >
                <option value="">Select Type</option>
                <option value="Taxi">Taxi</option>
                <option value="Rental Car">Rental Car</option>
                <option value="Train">Train</option>
                <option value="Bus">Bus</option>
                <option value="Private Transfer">Private Transfer</option>
              </select>
              <input
                type="text"
                placeholder="Company Name"
                value={item.company}
                onChange={(e) => updateTransport(i, 'company', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="text"
                placeholder="Confirmation #"
                value={item.confirmation}
                onChange={(e) => updateTransport(i, 'confirmation', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="time"
                value={item.pickup_time}
                onChange={(e) => updateTransport(i, 'pickup_time', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
              <input
                type="text"
                placeholder="Pickup Location"
                value={item.pickup_location}
                onChange={(e) => updateTransport(i, 'pickup_location', e.target.value)}
                className="px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              />
            </div>
            <textarea
              placeholder="Additional Notes"
              value={item.notes}
              onChange={(e) => updateTransport(i, 'notes', e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm print:border-0 print:p-0"
              rows={2}
            />
            <button onClick={() => removeTransport(i)} className="text-red-600 hover:text-red-800 text-sm mt-2 print:hidden">
              <Trash2 className="w-4 h-4 inline mr-1" />
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function TravelDocsSection({ docs, onChange }: any) {
  function updateField(field: string, value: string) {
    onChange({ ...docs, [field]: value })
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6 print:shadow-none print:border-0 print:break-inside-avoid">
      <h2 className="text-lg font-bold mb-4 print:text-xl">Travel Documents</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <LabeledInput
          label="Visa Number"
          value={docs?.visa_number || ''}
          onChange={(v: string) => updateField('visa_number', v)}
        />
        <LabeledDate
          label="Visa Expiry"
          value={docs?.visa_expiry || ''}
          onChange={(v: string) => updateField('visa_expiry', v)}
        />
        <LabeledInput
          label="Insurance Policy Number"
          value={docs?.insurance_policy || ''}
          onChange={(v: string) => updateField('insurance_policy', v)}
        />
        <LabeledInput
          label="Insurance Provider"
          value={docs?.insurance_provider || ''}
          onChange={(v: string) => updateField('insurance_provider', v)}
        />
        <LabeledInput
          label="Emergency Contact"
          value={docs?.emergency_contact || ''}
          onChange={(v: string) => updateField('emergency_contact', v)}
        />
      </div>
    </section>
  )
}

function toast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  const base = 'fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in'
  const color =
    variant === 'success' ? 'bg-green-600' : variant === 'error' ? 'bg-red-600' : 'bg-slate-800'
  const notification = document.createElement('div')
  notification.className = `${base} ${color}`
  notification.textContent = message
  document.body.appendChild(notification)
  setTimeout(() => notification.remove(), 3000)
}