// File: app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase, generateItineraryCode, type Itinerary } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, FileText, LogOut, X, Calendar, Users, Plane } from 'lucide-react'

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#62BBC1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Premium Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Travel Dashboard</h1>
              <p className="text-sm text-white/70 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">My Itineraries</h2>
            <p className="text-slate-600">Manage all your travel plans in one place</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            Create New Itinerary
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{itineraries.length}</div>
            <div className="text-blue-100 text-sm font-medium">Total Itineraries</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Plane className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{itineraries.filter(i => i.status === 'sent').length}</div>
            <div className="text-emerald-100 text-sm font-medium">Active Trips</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{itineraries.filter(i => i.status === 'draft').length}</div>
            <div className="text-purple-100 text-sm font-medium">Drafts</div>
          </div>
        </div>

        {/* Itineraries Grid */}
        {itineraries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-xl border border-slate-200">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No itineraries yet</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Get started by creating your first travel itinerary. It only takes a minute!
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-8 py-3 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all font-semibold"
            >
              Create Your First Itinerary
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/dashboard/edit/${item.id}`)}
                className="group bg-white rounded-2xl shadow-lg border-2 border-slate-200 hover:border-[#62BBC1] hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-br from-slate-50 to-white p-6 border-b border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="font-mono text-sm font-bold text-[#62BBC1] bg-[#62BBC1]/10 px-3 py-1.5 rounded-lg">
                      {item.code}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-[#62BBC1] transition">
                    {item.doc_title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 min-h-[40px]">
                    {item.trip_tag || 'No description'}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="p-6 bg-white">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4" />
                      <span className="font-medium truncate max-w-[120px]">
                        {item.participants?.split(';')[0] || 'No travelers'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">
                        {new Date(item.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover Effect Indicator */}
                <div className="h-1 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
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
  const styles = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    sent: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }
  
  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border-2 ${styles[status as keyof typeof styles]}`}>
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
          created_by: user.id,
          ...form,
          flights: [],
          visits: [],
          accommodation: [],
          transport: [],
          travel_docs: {},
          status: 'draft',
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1">Create New Itinerary</h2>
              <p className="text-white/70 text-sm">Fill in the details to get started</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/70 hover:text-white hover:scale-110 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleCreate} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Document Title *</label>
            <input
              type="text"
              value={form.doc_title}
              onChange={(e) => setForm({ ...form, doc_title: e.target.value })}
              placeholder="e.g., Singapore Business Trip"
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Trip Tag *</label>
            <input
              type="text"
              value={form.trip_tag}
              onChange={(e) => setForm({ ...form, trip_tag: e.target.value })}
              placeholder="e.g., Management Support"
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Participants *</label>
            <input
              type="text"
              value={form.participants}
              onChange={(e) => setForm({ ...form, participants: e.target.value })}
              placeholder="e.g., John Doe; Jane Smith"
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Purpose *</label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g., Business Support Services"
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">End Date *</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#62BBC1] focus:ring-4 focus:ring-[#62BBC1]/10 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-xl hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                'Create & Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}