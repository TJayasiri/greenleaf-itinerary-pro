import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        id: authData.user.id,
        name,
        email,
        role,
      })

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 400 })
    }

    return NextResponse.json({ data: authData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}