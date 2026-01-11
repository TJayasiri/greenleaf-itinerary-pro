import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side client for API routes
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Types
export interface UserRole {
  id: string
  role: 'admin' | 'coordinator'
  name: string
  email: string
  created_at: string
}

export interface Itinerary {
  id: string
  code: string
  created_by: string
  created_at: string
  updated_at: string
  doc_title: string
  trip_tag: string
  brand_name: string
  logo_url: string
  participants: string
  phones: string
  purpose: string
  factory: string
  start_date: string
  end_date: string
  flights: any[]
  visits: any[]
  notes: any
  signatures: any
  watermark: any
  status: 'draft' | 'sent' | 'completed' | 'cancelled'
  sent_to?: string
  sent_at?: string
}

export interface Document {
  id: string
  itinerary_id: string
  file_name: string
  file_path: string
  file_type: 'hotel' | 'taxi' | 'flight' | 'visa' | 'other'
  file_size: number
  uploaded_at: string
}

export function generateItineraryCode(): string {
  const year = new Date().getFullYear()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  // Use cryptographically secure random number generation
  const randomBytes = new Uint8Array(6)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes)
  } else {
    // Fallback for environments without crypto (should rarely happen in browser/Node)
    for (let i = 0; i < 6; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256)
    }
  }

  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomBytes[i] % chars.length)
  }
  return `IT-${year}-${code}`
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data } = await supabase
    .from('user_roles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return data
}

export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role?.role === 'admin'
}