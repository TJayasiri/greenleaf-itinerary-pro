import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Send real email
    const { data, error: emailError } = await resend.emails.send({
      from: 'Greenleaf Itinerary <onboarding@resend.dev>', // Change later to your domain
      to: email,
      subject: `Your Travel Itinerary - ${itinerary.code}`,
      html: generateEmailHtml(itinerary, lookupUrl),
    })

    if (emailError) {
      console.error('Email error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Update status
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
      message: `Email sent to ${email}` 
    })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function generateEmailHtml(itinerary: any, lookupUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Travel Itinerary</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: #62BBC1; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0; color: white; font-size: 28px;">Your Travel Itinerary</h1>
      <p style="margin: 12px 0 0; color: white; opacity: 0.9;">All your travel details in one place</p>
    </div>

    <div style="background: white; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px; font-size: 22px; color: #1e293b;">${itinerary.doc_title || 'Travel Itinerary'}</h2>
      <p style="margin: 0 0 24px; color: #64748b;">${itinerary.trip_tag || ''}</p>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="margin-bottom: 16px;">
          <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">ITINERARY CODE</div>
          <div style="font-family: monospace; font-size: 24px; font-weight: bold; color: #62BBC1;">${itinerary.code}</div>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <div style="margin-bottom: 12px;">
            <div style="color: #64748b; font-size: 12px;">Travelers</div>
            <div style="color: #1e293b; font-weight: 600;">${itinerary.participants || 'N/A'}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 12px;">Travel Dates</div>
            <div style="color: #1e293b;">${new Date(itinerary.start_date).toLocaleDateString()} - ${new Date(itinerary.end_date).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <a href="${lookupUrl}" style="display: block; padding: 16px; background: #62BBC1; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Full Itinerary
      </a>
    </div>

    <div style="text-align: center; color: #94a3b8; font-size: 13px;">
      <p>© ${new Date().getFullYear()} Greenleaf Assurance</p>
    </div>
  </div>
</body>
</html>
  `
}