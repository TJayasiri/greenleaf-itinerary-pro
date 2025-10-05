import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { itineraryId, email } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', itineraryId)
      .single()

    if (error || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const lookupUrl = `${appUrl}/?code=${itinerary.code}`

    console.log('=== EMAIL WOULD BE SENT ===')
    console.log('To:', email)
    console.log('Code:', itinerary.code)
    console.log('URL:', lookupUrl)
    console.log('===========================')

    await supabase
      .from('itineraries')
      .update({ 
        status: 'sent', 
        sent_to: email, 
        sent_at: new Date().toISOString() 
      })
      .eq('id', itineraryId)

    return NextResponse.json({ 
      success: true, 
      message: `Email logged to ${email}` 
    })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}