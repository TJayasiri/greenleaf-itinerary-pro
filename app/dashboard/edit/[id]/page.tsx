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
    if (!itinerary) return

    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Greenleaf Assurance//Itinerary//EN\n'
    
    if (itinerary.start_date && itinerary.end_date) {
      icsContent += 'BEGIN:VEVENT\n'
      icsContent += `UID:${itinerary.code || 'itinerary'}@greenleafassurance.com\n`
      icsContent += `DTSTART:${formatICSDate(itinerary.start_date)}\n`
      icsContent += `DTEND:${formatICSDate(itinerary.end_date)}\n`
      icsContent += `SUMMARY:${itinerary.doc_title || 'Business Trip'}\n`
      icsContent += `DESCRIPTION:${itinerary.purpose || 'Business travel'}\\nCode: ${itinerary.code || ''}\n`
      icsContent += 'END:VEVENT\n'
    }

    const flights = (itinerary as any).flights || []
    flights.forEach((flight: any, i: number) => {
      if (flight.date && flight.dep) {
        icsContent += 'BEGIN:VEVENT\n'
        icsContent += `UID:${itinerary.code || 'itinerary'}-flight-${i}@greenleafassurance.com\n`
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

        {/* Print sections omitted for brevity - keep your existing print sections */}

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6 print:hidden">
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
                  onChange={(v: string) => setItinerary({ ...itinerary, doc_title: v })}
                  placeholder="e.g., Singapore Business Trip"
                />
                <PremiumInput
                  label="Trip Tag"
                  value={itinerary.trip_tag || ''}
                  onChange={(v: string) => setItinerary({ ...itinerary, trip_tag: v })}
                  placeholder="e.g., Management Support"
                />
                <PremiumInput
                  label="Participants"
                  value={itinerary.participants || ''}
                  onChange={(v: string) => setItinerary({ ...itinerary, participants: v })}
                  placeholder="e.g., John Doe"
                />
                <PremiumInput
                  label="Contact Phones"
                  value={itinerary.phones || ''}
                  onChange={(v: string) => setItinerary({ ...itinerary, phones: v })}
                  placeholder="e.g., +1234567890"
                />
                <PremiumInput
                  label="Purpose"
                  value={itinerary.purpose || ''}
                  onChange={(v: string) => setItinerary({ ...itinerary, purpose: v })}
                  placeholder="e.g., Business Support Services"
                />
                <PremiumInput
                  label="Factory/Sites"
                  value={itinerary.factory || ''}
                  onChange={(v: string) => setItinerary({ ...itinerary, factory: v })}
                  placeholder="e.g., Singapore"
                />
                <PremiumDate
                  label="Start Date"
                  value={(itinerary.start_date as string) || ''}
                  onChange={(v: string) => setItinerary({ ...itinerary, start_date: v })}
                />
                <PremiumDate
                  label="End Date"
                  value={(itinerary.end_date as string) || ''}
                  onChange={(v: string) => setItinerary({ ...itinerary, end_date: v })}
                />
              </div>
            </div>
          </section>

          <FlightsSection
            flights={(itinerary as any).flights || []}
            onChange={(flights: any[]) => setItinerary({ ...itinerary, flights } as any)}
          />

          <VisitsSection
            visits={(itinerary as any).visits || []}
            onChange={(visits: any[]) => setItinerary({ ...itinerary, visits } as any)}
          />

          <AccommodationSection
            accommodation={(itinerary as any).accommodation || []}
            onChange={(accommodation: any[]) => setItinerary({ ...itinerary, accommodation } as any)}
          />

          <GroundTransportSection
            transport={(itinerary as any).transport || []}
            onChange={(transport: any[]) => setItinerary({ ...itinerary, transport } as any)}
          />

          <TravelDocsSection
            docs={(itinerary as any).travel_docs || {}}
            onChange={(travel_docs: any) => setItinerary({ ...itinerary, travel_docs } as any)}
          />
        </main>
      </div>

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
    </>
  )
}

// Component definitions with proper types
interface PremiumInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}

function PremiumInput({ label, value, onChange, placeholder }: PremiumInputProps) {
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

interface PremiumDateProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function PremiumDate({ label, value, onChange }: PremiumDateProps) {
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

// Add all other section components here (FlightsSection, VisitsSection, etc.)
// Keep them exactly as in the previous full code I provided

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

// Placeholder for section components - add FlightsSection, VisitsSection, etc.
function FlightsSection({ flights, onChange }: any) { return null }
function VisitsSection({ visits, onChange }: any) { return null }
function AccommodationSection({ accommodation, onChange }: any) { return null }
function GroundTransportSection({ transport, onChange }: any) { return null }
function TravelDocsSection({ docs, onChange }: any) { return null }