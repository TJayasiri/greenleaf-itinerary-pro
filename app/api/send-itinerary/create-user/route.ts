import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Valid roles whitelist
const VALID_ROLES = ['admin', 'coordinator'] as const
type ValidRole = typeof VALID_ROLES[number]

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Input validation function
function validateInput(data: { email?: string; password?: string; name?: string; role?: string }): { valid: boolean; error?: string } {
  if (!data.email || typeof data.email !== 'string' || !EMAIL_REGEX.test(data.email.trim())) {
    return { valid: false, error: 'Invalid email address' }
  }

  if (!data.password || typeof data.password !== 'string' || data.password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' }
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters long' }
  }

  if (!data.role || !VALID_ROLES.includes(data.role as ValidRole)) {
    return { valid: false, error: 'Invalid role. Must be either "admin" or "coordinator"' }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    // --- AUTHENTICATION CHECK ---
    // Create a server client to verify the current user session
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    // Get current authenticated user
    const { data: { user: currentUser }, error: authCheckError } = await supabaseAuth.auth.getUser()

    if (authCheckError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    // --- AUTHORIZATION CHECK ---
    // Verify the current user is an admin
    const { data: userRole, error: roleCheckError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (roleCheckError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    // --- INPUT PARSING AND VALIDATION ---
    const body = await request.json()
    const { email, password, name, role } = body

    const validation = validateInput({ email, password, name, role })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedName = name.trim()
    const sanitizedRole = role as ValidRole

    // --- CREATE USER (using service role for admin operations) ---
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password,
      email_confirm: true,
    })

    if (authError) {
      // Return generic error message to client
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 400 })
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        id: authData.user.id,
        name: sanitizedName,
        email: sanitizedEmail,
        role: sanitizedRole,
      })

    if (roleError) {
      // Clean up: delete the auth user if role insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Failed to assign user role' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: authData.user.id,
        email: sanitizedEmail,
        name: sanitizedName,
        role: sanitizedRole
      }
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
