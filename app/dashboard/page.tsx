'use client'

import { useState, useEffect } from 'react'
import { supabase, generateItineraryCode, type Itinerary } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, FileText, LogOut, X } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    checkAuth()
    loadItineraries()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  async function loadItineraries() {
    const { data } = await supabase
      .from('itineraries')
      .select('*')
      .order('created_at', { ascending: false })
    
    setItineraries(data || [])
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Coordinator Dashboard</h1>
            <p className="text-sm text-slate-600">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">My Itineraries</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] transition"
          >
            <Plus className="w-5 h-5" />
            Create New Itinerary
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itineraries.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/dashboard/edit/${item.id}`)}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md transition cursor-pointer p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="font-mono text-sm font-bold text-[#62BBC1]">{item.code}</div>
                <StatusBadge status={item.status} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{item.doc_title || 'Untitled'}</h3>
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{item.trip_tag}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{item.participants?.split(';')[0] || 'No travelers'}</span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {itineraries.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No itineraries yet</h3>
            <p className="text-slate-600 mb-4">Create your first travel itinerary</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] transition"
            >
              Create Itinerary
            </button>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateItineraryModal
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            loadItineraries()
            router.push(`/dashboard/edit/${id}`)
          }}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
      {status}
    </span>
  )
}

function CreateItineraryModal({ user, onClose, onCreated }: { user: any; onClose: () => void; onCreated: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    doc_title: '',
    trip_tag: '',
    participants: '',
    purpose: '',
    start_date: '',
    end_date: '',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const code = generateItineraryCode()

      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          code,
          created_by: user.id, // FIXED: Use actual logged-in user
          ...form,
          flights: [],
          visits: [],
          accommodation: [],
          ground_transport: [],
          travel_docs: {},
          notes: {},
          signatures: {},
          watermark: {},
          brand_name: 'Greenleaf Assurance',
        })
        .select()
        .single()

      if (error) throw error

      onCreated(data.id)
    } catch (err: any) {
      console.error('Create error:', err)
      alert('Failed to create itinerary: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">Create New Itinerary</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Document Title</label>
            <input
              type="text"
              value={form.doc_title}
              onChange={(e) => setForm({ ...form, doc_title: e.target.value })}
              placeholder="e.g., Official Business Itinerary"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Trip Tag</label>
            <input
              type="text"
              value={form.trip_tag}
              onChange={(e) => setForm({ ...form, trip_tag: e.target.value })}
              placeholder="e.g., Singapore Client Visits"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Participants</label>
            <input
              type="text"
              value={form.participants}
              onChange={(e) => setForm({ ...form, participants: e.target.value })}
              placeholder="e.g., JANE DOE; JOHN LEE"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Purpose</label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g., Business Support Services"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-[#62BBC1] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] disabled:opacity-50 transition"
            >
              {loading ? 'Creating...' : 'Create & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}