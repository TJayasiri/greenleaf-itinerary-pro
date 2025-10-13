// File: app/dashboard/edit/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase, type Itinerary } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Save, ArrowLeft, Send, Upload, Trash2, Plus, Link as LinkIcon, Download, Mail, X, Calendar, MapPin, Plane, Building2, FileText } from 'lucide-react'

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
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    checkAuth()
    if (id) {
      loadItinerary()
      loadDocuments()
    }
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

  async function handleSave() {
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
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Greenleaf Assurance//Itinerary//EN\n'
    
    if (itinerary.start_date && itinerary.end_date) {
      icsContent += 'BEGIN:VEVENT\n'
      icsContent += `UID:${itinerary.code}@greenleafassurance.com\n`
      icsContent += `DTSTART:${formatICSDate(itinerary.start_date)}\n`
      icsContent += `DTEND:${formatICSDate(itinerary.end_date)}\n`
      icsContent += `SUMMARY:${itinerary.doc_title || 'Business Trip'}\n`
      icsContent += `DESCRIPTION:${itinerary.purpose || 'Business travel'}\\nCode: ${itinerary.code}\n`
      icsContent += 'END:VEVENT\n'
    }

    const flights = (itinerary as any).flights || []
    flights.forEach((flight: any, i: number) => {
      if (flight.date && flight.dep) {
        icsContent += 'BEGIN:VEVENT\n'
        icsContent += `UID:${itinerary.code}-flight-${i}@greenleafassurance.com\n`
        icsContent += `DTSTART:${formatICSDateTime(flight.date, flight.dep)}\n`
        icsContent += `SUMMARY:Flight ${flight.flight} - ${flight.from} to ${flight.to}\n`
        icsContent += 'END:VEVENT\n'
      }
    })

    icsContent += 'END:VCALENDAR'

    const blob = new Blob([icsContent], { type: 'text/calendar' })
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

  if (loading || !itinerary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#62BBC1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading itinerary...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Premium Header - Hidden on print */}
        <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl print:hidden sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => router.push('/dashboard')} 
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {itinerary.doc_title || 'Edit Itinerary'}
                  </h1>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono text-[#62BBC1] font-semibold">{itinerary.code}</span>
                    <span className="text-white/50">•</span>
                    <span className="text-white/70">{itinerary.trip_tag}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 py-2 overflow-hidden">
                        <button
                          onClick={() => { handlePrint(); setShowExportMenu(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent flex items-center gap-3 transition group"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">Print / PDF</div>
                            <div className="text-xs text-slate-500">Executive layout</div>
                          </div>
                        </button>
                        <button
                          onClick={() => { exportToICS(); setShowExportMenu(false); }}
                          className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-green-50 hover:to-transparent flex items-center gap-3 transition group"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition">
                            <Calendar className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">Calendar Export</div>
                            <div className="text-xs text-slate-500">TripIt compatible</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-lg hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all font-medium"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-900 rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Print-Only Executive Header */}
        <div className="hidden print:block print-no-break">
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '40px 40px 30px 40px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>
                Business Travel Itinerary
              </div>
              <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                {itinerary.doc_title || 'Travel Itinerary'}
              </h1>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '16px' }}>
                {itinerary.trip_tag}
              </div>
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '8px 16px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Reference Code</span>
                <div style={{ color: 'white', fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, letterSpacing: '2px', marginTop: '2px' }}>
                  {itinerary.code}
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', marginRight: '-100px', marginTop: '-100px' }} />
          </div>

          {/* Travel Overview - Compact */}
          <div style={{ padding: '30px 40px 20px 40px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', paddingBottom: '8px', borderBottom: '3px solid #3b82f6' }}>
              Travel Overview
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Traveler
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  {itinerary.participants}
                </div>
              </div>
              
              <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Contact
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  {itinerary.phones}
                </div>
              </div>
              
              <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Travel Dates
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  {itinerary.start_date} - {itinerary.end_date}
                </div>
              </div>
              
              <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Purpose
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  {itinerary.purpose}
                </div>
              </div>
            </div>
          </div>

          {/* Flights */}
          {((itinerary as any).flights || []).length > 0 && (
            <div className="print-no-break" style={{ padding: '0 40px 20px 40px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', paddingBottom: '8px', borderBottom: '3px solid #3b82f6' }}>
                ✈️ Flight Schedule
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {((itinerary as any).flights || []).map((flight: any, i: number) => (
                  <div key={i} style={{ background: 'white', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6' }}>
                        {flight.flight}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: '999px' }}>
                        {new Date(flight.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Departure</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{flight.from}</div>
                        <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>{flight.dep}</div>
                      </div>
                      
                      <div style={{ fontSize: '24px', color: '#cbd5e1' }}>→</div>
                      
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Arrival</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{flight.to}</div>
                        <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>{flight.arr}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Site Visits */}
          {((itinerary as any).visits || []).length > 0 && (
            <div className="print-no-break" style={{ padding: '0 40px 20px 40px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px', paddingBottom: '8px', borderBottom: '3px solid #3b82f6' }}>
                📍 Site Visits & Activities
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {((itinerary as any).visits || []).map((visit: any, i: number) => (
                  <div key={i} style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #f1f5f9 100%)', borderLeft: '3px solid #3b82f6', borderRadius: '6px', padding: '14px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', background: '#bfdbfe', padding: '3px 10px', borderRadius: '999px', display: 'inline-block', marginBottom: '8px' }}>
                      {new Date(visit.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                      {visit.activity}
                    </h3>
                    
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      {visit.facility}
                    </div>
                    
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                      📍 {visit.address}
                    </div>
                    
                    <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.8)', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '3px 10px', fontSize: '10px', fontWeight: 600, color: '#334155' }}>
                      🚗 {visit.transport}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ background: 'linear-gradient(to right, #f8f9fa 0%, #e9ecef 100%)', borderTop: '3px solid #3b82f6', padding: '24px 40px', textAlign: 'center', marginTop: '30px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              Greenleaf Assurance
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              Professional Travel Management Services
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Generated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • Ref: {itinerary.code}
            </div>
          </div>
        </div>

        {/* Main Content - Premium Edit View */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6 print:hidden">
          {/* Basic Info - Premium Card */}
          <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
              </div>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                <PremiumInput
                  label="Document Title"
                  value={itinerary.doc_title || ''}
                  onChange={(v) => setItinerary({ ...itinerary, doc_title: v })}
                  placeholder="e.g., Singapore Business Trip"
                />
                <PremiumInput
                  label="Trip Tag"
                  value={itinerary.trip_tag || ''}
                  onChange={(v) => setItinerary({ ...itinerary, trip_tag: v })}
                  placeholder="e.g., Management Support"
                />
                <PremiumInput
                  label="Participants"
                  value={itinerary.participants || ''}
                  onChange={(v) => setItinerary({ ...itinerary, participants: v })}
                  placeholder="e.g., John Doe"
                />
                <PremiumInput
                  label="Contact Phones"
                  value={itinerary.phones || ''}
                  onChange={(v) => setItinerary({ ...itinerary, phones: v })}
                  placeholder="e.g., +1234567890"
                />
                <PremiumInput
                  label="Purpose"
                  value={itinerary.purpose || ''}
                  onChange={(v) => setItinerary({ ...itinerary, purpose: v })}
                  placeholder="e.g., Business Support Services"
                />
                <PremiumInput
                  label="Factory/Sites"
                  value={itinerary.factory || ''}
                  onChange={(v) => setItinerary({ ...itinerary, factory: v })}
                  placeholder="e.g., Singapore"
                />
                <PremiumDate
                  label="Start Date"
                  value={(itinerary.start_date as string) || ''}
                  onChange={(v) => setItinerary({ ...itinerary, start_date: v })}
                />
                <PremiumDate
                  label="End Date"
                  value={(itinerary.end_date as string) || ''}
                  onChange={(v) => setItinerary({ ...itinerary, end_date: v })}
                />
              </div>
            </div>
          </section>

          {/* Flights - Premium Card */}
          <FlightsSection
            flights={(itinerary as any).flights || []}
            onChange={(flights) => setItinerary({ ...(itinerary as any), flights })}
          />

          {/* Site Visits - Premium Card */}
          <VisitsSection
            visits={(itinerary as any).visits || []}
            onChange={(visits) => setItinerary({ ...(itinerary as any), visits })}
          />

          {/* Accommodation - Premium Card */}
          <AccommodationSection
            accommodation={(itinerary as any).accommodation || []}
            onChange={(accommodation) => setItinerary({ ...(itinerary as any), accommodation })}
          />

          {/* Ground Transport - Premium Card */}
          <GroundTransportSection
            transport={(itinerary as any).transport || []}
            onChange={(transport) => setItinerary({ ...(itinerary as any), transport })}
          />

          {/* Travel Docs - Premium Card */}
          <TravelDocsSection
            docs={(itinerary as any).travel_docs || {}}
            onChange={(travel_docs) => setItinerary({ ...(itinerary as any), travel_docs })}
          />

          {/* Documents - Premium Card */}
          <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6 border-b border-purple-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Attached Documents</h2>
                </div>
                <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 cursor-pointer transition-all font-medium">
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
            </div>

            <div className="p-8">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No documents uploaded yet</p>
                  <p className="text-sm text-slate-400 mt-1">Add hotel bookings, tickets, etc.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl hover:shadow-md transition group">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{doc.file_name}</div>
                        <div className="text-xs text-slate-500">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}
                        </div>
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Open
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                        className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          html {
            zoom: 0.85;
          }
          
          .print-no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </>
  )
}

// Premium Input Components
function PremiumInput({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
      />
    </div>
  )
}

function PremiumDate({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
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
    <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 px-8 py-6 border-b border-sky-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Flight Schedule</h2>
          </div>
          <button
            onClick={addFlight}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Flight
          </button>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {flights.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No flights added yet</div>
        ) : (
          flights.map((flight: any, i: number) => (
            <div key={i} className="p-6 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl hover:shadow-md transition group">
              <div className="grid grid-cols-7 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Flight No"
                  value={flight.flight}
                  onChange={(e) => updateFlight(i, 'flight', e.target.value)}
                  className="px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={flight.date}
                  onChange={(e) => updateFlight(i, 'date', e.target.value)}
                  className="px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="From"
                  value={flight.from}
                  onChange={(e) => updateFlight(i, 'from', e.target.value)}
                  className="px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="To"
                  value={flight.to}
                  onChange={(e) => updateFlight(i, 'to', e.target.value)}
                  className="px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={flight.dep}
                  onChange={(e) => updateFlight(i, 'dep', e.target.value)}
                  className="px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={flight.arr}
                  onChange={(e) => updateFlight(i, 'arr', e.target.value)}
                  className="px-3 py-2 bg-white border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 focus:outline-none"
                />
                <button 
                  onClick={() => removeFlight(i)} 
                  className="text-slate-400 hover:text-red-600 hover:scale-110 transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
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
    <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-8 py-6 border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Site Visits</h2>
          </div>
          <button
            onClick={addVisit}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Visit
          </button>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {visits.map((visit: any, i: number) => (
          <div key={i} className="p-6 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl hover:shadow-md transition group">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <input
                type="date"
                value={visit.date}
                onChange={(e) => updateVisit(i, 'date', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Activity"
                value={visit.activity}
                onChange={(e) => updateVisit(i, 'activity', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Facility"
                value={visit.facility}
                onChange={(e) => updateVisit(i, 'facility', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-5 gap-4 items-start">
              <textarea
                placeholder="Address"
                value={visit.address}
                onChange={(e) => updateVisit(i, 'address', e.target.value)}
                className="col-span-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
                rows={2}
              />
              <input
                type="text"
                placeholder="Transport"
                value={visit.transport}
                onChange={(e) => updateVisit(i, 'transport', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button
                onClick={() => removeVisit(i)}
                className="text-slate-400 hover:text-red-600 hover:scale-110 transition self-start mt-2 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
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
    onChange([...accommodation, { hotel_name: '', checkin: '', checkout: '', confirmation: '', address: '', phone: '' }])
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
    <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Accommodation</h2>
          </div>
          <button
            onClick={addAccommodation}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Hotel
          </button>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {accommodation.map((hotel: any, i: number) => (
          <div key={i} className="p-6 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl hover:shadow-md transition group">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Hotel Name"
                value={hotel.hotel_name}
                onChange={(e) => updateAccommodation(i, 'hotel_name', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-amber-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Confirmation Number"
                value={hotel.confirmation}
                onChange={(e) => updateAccommodation(i, 'confirmation', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Check-in</label>
                <input
                  type="date"
                  value={hotel.checkin}
                  onChange={(e) => updateAccommodation(i, 'checkin', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Check-out</label>
                <input
                  type="date"
                  value={hotel.checkout}
                  onChange={(e) => updateAccommodation(i, 'checkout', e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Address"
                value={hotel.address}
                onChange={(e) => updateAccommodation(i, 'address', e.target.value)}
                className="col-span-2 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-amber-500 focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={hotel.phone}
                onChange={(e) => updateAccommodation(i, 'phone', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button 
              onClick={() => removeAccommodation(i)} 
              className="mt-4 text-slate-400 hover:text-red-600 hover:scale-110 transition opacity-0 group-hover:opacity-100 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Remove</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function GroundTransportSection({ transport, onChange }: any) {
  function addTransport() {
    onChange([...transport, { type: '', company: '', confirmation: '', pickup_time: '', pickup_location: '', notes: '' }])
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
    <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-8 py-6 border-b border-violet-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Ground Transportation</h2>
          </div>
          <button
            onClick={addTransport}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Transport
          </button>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {transport.map((item: any, i: number) => (
          <div key={i} className="p-6 bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl hover:shadow-md transition group">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <select
                value={item.type}
                onChange={(e) => updateTransport(i, 'type', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
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
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Confirmation #"
                value={item.confirmation}
                onChange={(e) => updateTransport(i, 'confirmation', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="time"
                value={item.pickup_time}
                onChange={(e) => updateTransport(i, 'pickup_time', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Pickup Location"
                value={item.pickup_location}
                onChange={(e) => updateTransport(i, 'pickup_location', e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <textarea
              placeholder="Additional Notes"
              value={item.notes}
              onChange={(e) => updateTransport(i, 'notes', e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:border-violet-500 focus:outline-none"
              rows={2}
            />
            <button 
              onClick={() => removeTransport(i)} 
              className="mt-4 text-slate-400 hover:text-red-600 hover:scale-110 transition opacity-0 group-hover:opacity-100 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Remove</span>
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
    <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 px-8 py-6 border-b border-cyan-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Travel Documents</h2>
        </div>
      </div>
      
      <div className="p-8">
        <div className="grid md:grid-cols-2 gap-6">
          <PremiumInput
            label="Visa Number"
            value={docs?.visa_number || ''}
            onChange={(v: string) => updateField('visa_number', v)}
            placeholder="e.g., TH-2025-847392"
          />
          <PremiumDate
            label="Visa Expiry"
            value={docs?.visa_expiry || ''}
            onChange={(v: string) => updateField('visa_expiry', v)}
          />
          <PremiumInput
            label="Insurance Policy Number"
            value={docs?.insurance_policy || ''}
            onChange={(v: string) => updateField('insurance_policy', v)}
            placeholder="e.g., TRAV-2025-991827"
          />
          <PremiumInput
            label="Insurance Provider"
            value={docs?.insurance_provider || ''}
            onChange={(v: string) => updateField('insurance_provider', v)}
            placeholder="e.g., AIG Travel Guard"
          />
          <PremiumInput
            label="Emergency Contact"
            value={docs?.emergency_contact || ''}
            onChange={(v: string) => updateField('emergency_contact', v)}
            placeholder="e.g., +1-800-555-9999"
          />
        </div>
      </div>
    </section>
  )
}

function EmailModal({ itinerary, itineraryId, onClose, onSuccess }: any) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!email) {
      toast('Please enter email', 'error')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/send-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itineraryId, email, customMessage: message }),
      })

      if (!response.ok) throw new Error('Failed to send')

      await supabase
        .from('itineraries')
        .update({ status: 'sent', sent_to: email, sent_at: new Date().toISOString() })
        .eq('id', itineraryId)

      toast('✓ Email sent!', 'success')
      onSuccess()
    } catch {
      toast('✗ Failed to send email', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Send Itinerary</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:scale-110 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Recipient Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="traveler@example.com"
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Custom Message (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note..."
              rows={4}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={onClose} 
              className="flex-1 px-6 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !email}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2 font-medium"
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

function toast(message: string, variant: 'success' | 'error' | 'info' = 'info') {
  const color = variant === 'success' ? 'bg-green-600' : variant === 'error' ? 'bg-red-600' : 'bg-slate-800'
  const notification = document.createElement('div')
  notification.className = `fixed top-4 right-4 text-white px-6 py-3 rounded-xl shadow-2xl z-50 ${color} animate-slide-in font-medium`
  notification.textContent = message
  document.body.appendChild(notification)
  setTimeout(() => notification.remove(), 3000)
}