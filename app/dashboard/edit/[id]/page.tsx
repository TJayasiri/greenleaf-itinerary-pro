// File: app/dashboard/edit/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase, type Itinerary } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Save, ArrowLeft, Send, Upload, Trash2, Plus, Link as LinkIcon } from 'lucide-react'

type Json = Record<string, any>
type DocRow = {
  id: string
  itinerary_id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  file_url?: string | null
  created_at?: string
}


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

  useEffect(() => {
    checkAuth()
    if (id) {
      loadItinerary()
      loadDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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
      alert('Failed to load itinerary')
      return
    }

    // FIXED: Load from ground_transport column
    setItinerary({
      ...data,
      flights: data?.flights ?? [],
      visits: data?.visits ?? [],
      accommodation: data?.accommodation ?? [],
      //transport: data?.ground_transport ?? [], // Read from ground_transport
      transport: data?.transport ?? [], // correct version added 10/13
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

  async function handleSave() {
    if (!itinerary || !id) return
    setSaving(true)

    try {
      // FIXED: Save transport to ground_transport column
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
        // ground_transport: (itinerary as any).transport ?? [], // Save to ground_transport
        transport: (itinerary as any).transport ?? [], // KEEP AS 'transport'
        travel_docs: (itinerary as any).travel_docs ?? {},
        updated_at: new Date().toISOString(),
      }
      

      const { error } = await supabase.from('itineraries').update(payload).eq('id', id)
      if (error) throw error

      toast('✓ Saved successfully!', 'success')
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

        const {
          data: { publicUrl },
        } = supabase.storage.from('itinerary-docs').getPublicUrl(fileName)

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

      await loadDocuments() // FIXED: removed (id)
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
      await loadDocuments() // FIXED: removed (id)
      toast('✓ Document deleted', 'success')
    } catch {
      toast('✗ Failed to delete', 'error')
    }
  }

  async function handleSendEmail() {
    if (!itinerary?.participants) {
      toast('Add participants first', 'error')
      return
    }

    const email = prompt('Enter email address to send itinerary:')
    if (!email) return

    try {
      const response = await fetch('/api/send-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itineraryId: id, email }),
      })

      if (!response.ok) throw new Error('Failed to send')

      await supabase
        .from('itineraries')
        .update({ status: 'sent', sent_to: email, sent_at: new Date().toISOString() })
        .eq('id', id)

      toast('✓ Email sent', 'success')
      await loadItinerary() // FIXED: removed (id)
    } catch {
      toast('✗ Failed to send email', 'error')
    }
  }

  if (loading || !itinerary) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard')} className="text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{itinerary.doc_title || 'Edit Itinerary'}</h1>
                <p className="text-sm text-slate-600">Code: {itinerary.code}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
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
                onClick={handleSendEmail}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
              >
                <Send className="w-4 h-4" />
                Send Email
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">Basic Information</h2>
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
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Attached Documents</h2>
            <label className="flex items-center gap-2 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] cursor-pointer transition">
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
            <div className="text-center py-8 text-slate-500">
              No documents uploaded yet. Add hotel bookings, tickets, etc.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center font-semibold">
                    {doc.file_type?.includes('pdf') ? 'PDF' : 'FILE'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{doc.file_name}</div>
                    <div className="text-xs text-slate-500">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}
                    </div>
                    {doc.file_url ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-700 hover:underline mt-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        Open
                      </a>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                    className="text-red-600 hover:text-red-800"
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
  )
}

/* ---------- Small UI atoms ---------- */

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
      />
    </div>
  )
}

function LabeledDate({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
      />
    </div>
  )
}

/* ---------- Sections ---------- */

// Accommodation
function AccommodationSection({
  accommodation,
  onChange,
}: {
  accommodation: any[]
  onChange: (accommodation: any[]) => void
}) {
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
    onChange(accommodation.filter((_, i) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Accommodation</h2>
        <button
          onClick={addAccommodation}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Hotel
        </button>
      </div>

      <div className="space-y-4">
        {accommodation.map((hotel, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Hotel Name"
                value={hotel.hotel_name}
                onChange={(e) => updateAccommodation(i, 'hotel_name', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Confirmation Number"
                value={hotel.confirmation}
                onChange={(e) => updateAccommodation(i, 'confirmation', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-600">Check-in</label>
                <input
                  type="date"
                  value={hotel.checkin}
                  onChange={(e) => updateAccommodation(i, 'checkin', e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Check-out</label>
                <input
                  type="date"
                  value={hotel.checkout}
                  onChange={(e) => updateAccommodation(i, 'checkout', e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                placeholder="Address"
                value={hotel.address}
                onChange={(e) => updateAccommodation(i, 'address', e.target.value)}
                className="col-span-2 px-3 py-2 border rounded text-sm"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={hotel.phone}
                onChange={(e) => updateAccommodation(i, 'phone', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
            </div>
            <button onClick={() => removeAccommodation(i)} className="text-red-600 hover:text-red-800 text-sm">
              <Trash2 className="w-4 h-4 inline mr-1" />
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// Ground Transport
function GroundTransportSection({
  transport,
  onChange,
}: {
  transport: any[]
  onChange: (transport: any[]) => void
}) {
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
    onChange(transport.filter((_, i) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Ground Transportation</h2>
        <button
          onClick={addTransport}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Transport
        </button>
      </div>

      <div className="space-y-4">
        {transport.map((item, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <select
                value={item.type}
                onChange={(e) => updateTransport(i, 'type', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
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
                className="px-3 py-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Confirmation #"
                value={item.confirmation}
                onChange={(e) => updateTransport(i, 'confirmation', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="time"
                value={item.pickup_time}
                onChange={(e) => updateTransport(i, 'pickup_time', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Pickup Location"
                value={item.pickup_location}
                onChange={(e) => updateTransport(i, 'pickup_location', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
            </div>
            <textarea
              placeholder="Additional Notes"
              value={item.notes}
              onChange={(e) => updateTransport(i, 'notes', e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
              rows={2}
            />
            <button onClick={() => removeTransport(i)} className="text-red-600 hover:text-red-800 text-sm mt-2">
              <Trash2 className="w-4 h-4 inline mr-1" />
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// Travel Docs
function TravelDocsSection({ docs, onChange }: { docs: any; onChange: (docs: any) => void }) {
  function updateField(field: string, value: string) {
    onChange({ ...docs, [field]: value })
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-bold mb-4">Travel Documents</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <LabeledInput
          label="Visa Number"
          value={docs?.visa_number || ''}
          onChange={(v) => updateField('visa_number', v)}
        />
        <LabeledDate
          label="Visa Expiry"
          value={docs?.visa_expiry || ''}
          onChange={(v) => updateField('visa_expiry', v)}
        />
        <LabeledInput
          label="Insurance Policy Number"
          value={docs?.insurance_policy || ''}
          onChange={(v) => updateField('insurance_policy', v)}
        />
        <LabeledInput
          label="Insurance Provider"
          value={docs?.insurance_provider || ''}
          onChange={(v) => updateField('insurance_provider', v)}
        />
        <LabeledInput
          label="Emergency Contact"
          value={docs?.emergency_contact || ''}
          onChange={(v) => updateField('emergency_contact', v)}
        />
      </div>
    </section>
  )
}

/* ---------- Utilities ---------- */

function toast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  const base = 'fixed top-4 right-4 text-white px-6 py-3 rounded-lg shadow-lg z-50'
  const color =
    variant === 'success' ? 'bg-green-600' : variant === 'error' ? 'bg-red-600' : 'bg-slate-800'
  const notification = document.createElement('div')
  notification.className = `${base} ${color}`
  notification.textContent = message
  document.body.appendChild(notification)
  setTimeout(() => notification.remove(), 3000)
}

/* ---------- Existing sections ---------- */

function FlightsSection({
  flights,
  onChange,
}: {
  flights: any[]
  onChange: (flights: any[]) => void
}) {
  function addFlight() {
    onChange([...flights, { flight: '', date: '', from: '', to: '', dep: '', arr: '' }])
  }
  function updateFlight(index: number, field: string, value: string) {
    const updated = [...flights]
    updated[index][field] = value
    onChange(updated)
  }
  function removeFlight(index: number) {
    onChange(flights.filter((_, i) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Flight Schedule</h2>
        <button
          onClick={addFlight}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Flight
        </button>
      </div>

      <div className="space-y-3">
        {flights.map((flight, i) => (
          <div key={i} className="grid grid-cols-7 gap-2 items-start p-3 bg-slate-50 rounded-lg">
            <input
              type="text"
              placeholder="Flight No"
              value={flight.flight}
              onChange={(e) => updateFlight(i, 'flight', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="date"
              value={flight.date}
              onChange={(e) => updateFlight(i, 'date', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="From"
              value={flight.from}
              onChange={(e) => updateFlight(i, 'from', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="To"
              value={flight.to}
              onChange={(e) => updateFlight(i, 'to', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="time"
              value={flight.dep}
              onChange={(e) => updateFlight(i, 'dep', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="time"
              value={flight.arr}
              onChange={(e) => updateFlight(i, 'arr', e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
            <button onClick={() => removeFlight(i)} className="text-red-600 hover:text-red-800">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function VisitsSection({
  visits,
  onChange,
}: {
  visits: any[]
  onChange: (visits: any[]) => void
}) {
  function addVisit() {
    onChange([...visits, { date: '', activity: '', facility: '', address: '', transport: '' }])
  }
  function updateVisit(index: number, field: string, value: string) {
    const updated = [...visits]
    updated[index][field] = value
    onChange(updated)
  }
  function removeVisit(index: number) {
    onChange(visits.filter((_, i) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Site Visits</h2>
        <button
          onClick={addVisit}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Visit
        </button>
      </div>

      <div className="space-y-3">
        {visits.map((visit, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="date"
                value={visit.date}
                onChange={(e) => updateVisit(i, 'date', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Activity"
                value={visit.activity}
                onChange={(e) => updateVisit(i, 'activity', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Facility"
                value={visit.facility}
                onChange={(e) => updateVisit(i, 'facility', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-5 gap-3 items-start">
              <textarea
                placeholder="Address"
                value={visit.address}
                onChange={(e) => updateVisit(i, 'address', e.target.value)}
                className="col-span-3 px-3 py-2 border rounded text-sm"
                rows={2}
              />
              <input
                type="text"
                placeholder="Transport"
                value={visit.transport}
                onChange={(e) => updateVisit(i, 'transport', e.target.value)}
                className="px-3 py-2 border rounded text-sm"
              />
              <button
                onClick={() => removeVisit(i)}
                className="text-red-600 hover:text-red-800 self-start mt-2"
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