// File: app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase, generateItineraryCode } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserPlus, Users, FileText, LogOut, Plus, X } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [itineraries, setItineraries] = useState<any[]>([])
  const [stats, setStats] = useState({ users: 0, itineraries: 0, thisMonth: 0 })
  const [showAddUser, setShowAddUser] = useState(false)
  const [showCreateItin, setShowCreateItin] = useState(false)

  useEffect(() => {
    checkAdmin()
    loadData()
  }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (role?.role !== 'admin') {
      router.push('/dashboard')
    }
  }

  async function loadData() {
    // Load users
    const { data: usersData } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(usersData || [])

    // Load all itineraries
    const { data: itinData } = await supabase
      .from('itineraries')
      .select('*')
      .order('created_at', { ascending: false })
    setItineraries(itinData || [])

    // Calculate stats
    const thisMonthCount = itinData?.filter(i => {
      const created = new Date(i.created_at)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length || 0

    setStats({
      users: usersData?.length || 0,
      itineraries: itinData?.length || 0,
      thisMonth: thisMonthCount,
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-600">System Management</p>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.users}</div>
                <div className="text-sm text-slate-600">Total Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.itineraries}</div>
                <div className="text-sm text-slate-600">Total Itineraries</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.thisMonth}</div>
                <div className="text-sm text-slate-600">This Month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCreateItin(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#62BBC1] to-[#51aab0] text-white rounded-lg hover:shadow-lg transition font-semibold"
          >
            <Plus className="w-5 h-5" />
            Create New Itinerary
          </button>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:border-[#62BBC1] transition font-semibold"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Users Section */}
        <section className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Users</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Itineraries */}
        <section className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold mb-4">Recent Itineraries</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Travelers</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {itineraries.slice(0, 10).map((itin) => (
                  <tr
                    key={itin.id}
                    onClick={() => router.push(`/dashboard/edit/${itin.id}`)}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-sm">{itin.code}</td>
                    <td className="px-4 py-3">{itin.doc_title || 'Untitled'}</td>
                    <td className="px-4 py-3 text-sm">{itin.participants?.split(';')[0] || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${itin.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                          itin.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                        {itin.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(itin.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modals */}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onAdded={loadData} />}
      {showCreateItin && (
        <CreateItineraryModal
          user={user}
          onClose={() => setShowCreateItin(false)}
          onCreated={(id) => {
            setShowCreateItin(false)
            loadData()
            router.push(`/dashboard/edit/${id}`)
          }}
        />
      )}
    </div>
  )
}

// Add User Modal (unchanged)
function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'coordinator' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/send-itinerary/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          role: form.role
        })
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      alert('User created successfully!')
      onAdded()
      onClose()
    } catch (err: any) {
      alert('Failed to create user: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Add New User</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:border-[#62BBC1] focus:outline-none"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:border-[#62BBC1] focus:outline-none"
            >
              <option value="coordinator">Coordinator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#62BBC1] text-white rounded-lg hover:bg-[#51aab0] disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Create Itinerary Modal (reused from coordinator dashboard)
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
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1">Create New Itinerary</h2>
              <p className="text-white/70 text-sm">Fill in the details to get started</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white hover:scale-110 transition">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

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