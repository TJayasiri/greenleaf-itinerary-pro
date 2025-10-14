// File: app/api/send-itinerary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    console.log('📧 Email request received:', { 
      itineraryId: body.itineraryId, 
      email: body.email,
      hasCustomMessage: !!body.customMessage 
    })

    const { itineraryId, email, customMessage } = body

    // Validate inputs
    if (!email || !itineraryId) {
      console.error('❌ Missing required fields:', { email, itineraryId })
      return NextResponse.json(
        { error: 'Email and itineraryId are required' },
        { status: 400 }
      )
    }

    // Check API key
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Get itinerary data
    console.log('📋 Fetching itinerary:', itineraryId)
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', itineraryId)
      .single()

    if (error || !itinerary) {
      console.error('❌ Itinerary not found:', error)
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      )
    }

    console.log('✅ Itinerary found:', itinerary.code)

    // Get documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('itinerary_id', itineraryId)

    console.log('📎 Documents found:', documents?.length || 0)

    // Generate email HTML
    const emailHtml = generateEmailHtml(itinerary, documents || [], customMessage)

    // Send email via Resend
    console.log('📤 Sending email to:', email)
    
    // Use test domain for now
    //const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@greenleafassurance.com'


    
    const { data, error: sendError } = await resend.emails.send({
      from: `Greenleaf Assurance <${fromEmail}>`,
      to: [email],
      subject: `Your Travel Itinerary: ${itinerary.doc_title || itinerary.code}`,
      html: emailHtml,
    })

    if (sendError) {
      console.error('❌ Resend error:', sendError)
      return NextResponse.json(
        { error: `Failed to send email: ${sendError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Email sent successfully:', data)
    return NextResponse.json({ success: true, data })
    
  } catch (err: any) {
    console.error('❌ Email API error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateEmailHtml(itinerary: any, documents: any[], customMessage?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://itinerary.greenleafassurance.com'
  const lookupUrl = `${appUrl}/?code=${itinerary.code}`

  const flights = itinerary.flights || []
  const visits = itinerary.visits || []
  const accommodation = itinerary.accommodation || []
  const transport = itinerary.transport || []

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Itinerary</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #62BBC1; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">Your Travel Itinerary</h1>
              <p style="margin: 10px 0 0 0; color: white; font-size: 14px;">Reference Code: <strong>${itinerary.code}</strong></p>
            </td>
          </tr>

            <!-- Custom Message -->

            <tr>
              <td style="padding: 30px; background-color: #f8f9fa; border-left: 4px solid #62BBC1;">
                <p style="margin: 0 0 15px 0; color: #333; font-size: 16px; line-height: 1.6;">
                  ${customMessage || `Dear ${itinerary.participants || 'Traveler'},`}
                </p>
                ${!customMessage ? `
                <p style="margin: 0 0 15px 0; color: #333; font-size: 15px; line-height: 1.6;">
                  Your complete travel itinerary for <strong>${itinerary.doc_title || 'your upcoming trip'}</strong> is ready. This document contains all essential details including flights, accommodation, site visits, and important contact information.
                </p>
                <p style="margin: 0 0 15px 0; color: #333; font-size: 15px; line-height: 1.6;">
                  ${itinerary.start_date ? `Your journey begins on <strong>${new Date(itinerary.start_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</strong>.` : ''} Please review all details carefully and contact us if you need any clarification or adjustments.
                </p>
                <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6;">
                  Have a safe and productive journey!
                </p>
                <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
                  <strong>Best regards,</strong><br/>
                  Greenleaf Assurance Travel Team
                </p>
                ` : `
                <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
                  <strong>Best regards,</strong><br/>
                  Greenleaf Assurance Travel Team
                </p>
                `}
              </td>
            </tr>

          <!-- Trip Summary -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px 0; color: #333; font-size: 22px; border-bottom: 2px solid #62BBC1; padding-bottom: 10px;">
                ${itinerary.doc_title || 'Business Trip'}
              </h2>
              
              <table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="color: #666; font-size: 14px; width: 150px;"><strong>Travelers:</strong></td>
                  <td style="color: #333; font-size: 14px;">${itinerary.participants || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-size: 14px;"><strong>Purpose:</strong></td>
                  <td style="color: #333; font-size: 14px;">${itinerary.purpose || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-size: 14px;"><strong>Dates:</strong></td>
                  <td style="color: #333; font-size: 14px;">${itinerary.start_date} to ${itinerary.end_date}</td>
                </tr>
                <tr>
                  <td style="color: #666; font-size: 14px;"><strong>Contact:</strong></td>
                  <td style="color: #333; font-size: 14px;">${itinerary.phones || 'N/A'}</td>
                </tr>
              </table>

              <!-- View Online Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${lookupUrl}" style="display: inline-block; background-color: #62BBC1; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  View Full Itinerary Online
                </a>
                <p style="margin: 10px 0 0 0; color: #666; font-size: 12px;">Or visit: ${lookupUrl}</p>
              </div>
            </td>
          </tr>

          <!-- Flights -->
          
          ${flights.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">✈️ Flight Schedule</h3>
              <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 6px;">
                ${flights.map((f: any) => `
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0;">
                    <div style="color: #333; font-size: 14px; font-weight: bold; margin-bottom: 5px;">
                      ${f.airline || 'Airline'} ${f.flight} - ${f.date}
                    </div>
                    <div style="color: #666; font-size: 13px; margin-bottom: 5px;">
                      ${f.from} → ${f.to} | Dep: ${f.dep} | Arr: ${f.arr}
                    </div>
                    ${f.pnr ? `<div style="color: #666; font-size: 12px;">PNR: <span style="font-family: monospace; color: #62BBC1;">${f.pnr}</span></div>` : ''}
                    ${f.eticket ? `<div style="color: #666; font-size: 12px;">E-ticket: <span style="font-family: monospace; color: #62BBC1;">${f.eticket}</span></div>` : ''}
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Accommodation -->
          ${accommodation.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">🏨 Accommodation</h3>
              <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 6px;">
                ${accommodation.map((h: any) => `
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0;">
                    <div style="color: #333; font-size: 14px; font-weight: bold; margin-bottom: 5px;">
                      ${h.hotel_name}
                    </div>
                    <div style="color: #666; font-size: 13px; margin-bottom: 3px;">
                      Check-in: ${h.checkin} | Check-out: ${h.checkout}
                    </div>
                    <div style="color: #666; font-size: 13px;">
                      ${h.address || ''} ${h.phone ? `| Phone: ${h.phone}` : ''}
                    </div>
                    ${h.confirmation ? `<div style="color: #62BBC1; font-size: 12px; margin-top: 5px;">Confirmation: ${h.confirmation}</div>` : ''}
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Site Visits -->
          ${visits.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📍 Site Visits</h3>
              <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 6px;">
                ${visits.map((v: any) => `
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0;">
                    <div style="color: #333; font-size: 14px; font-weight: bold; margin-bottom: 5px;">
                      ${v.date} - ${v.activity}
                    </div>
                    <div style="color: #666; font-size: 13px;">
                      ${v.facility} | ${v.address}
                    </div>
                    ${v.transport ? `<div style="color: #666; font-size: 12px; margin-top: 5px;">Transport: ${v.transport}</div>` : ''}
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Ground Transport -->
          ${transport.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">🚗 Ground Transportation</h3>
              <table width="100%" cellpadding="10" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 6px;">
                ${transport.map((t: any) => `
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0;">
                    <div style="color: #333; font-size: 14px; font-weight: bold; margin-bottom: 5px;">
                      ${t.type} - ${t.company}
                    </div>
                    <div style="color: #666; font-size: 13px;">
                      Pickup: ${t.pickup_time} at ${t.pickup_location}
                    </div>
                    ${t.confirmation ? `<div style="color: #62BBC1; font-size: 12px; margin-top: 5px;">Confirmation: ${t.confirmation}</div>` : ''}
                    ${t.notes ? `<div style="color: #666; font-size: 12px; margin-top: 5px; font-style: italic;">${t.notes}</div>` : ''}
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Documents -->
          ${documents.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📎 Attached Documents</h3>
              <table width="100%" cellpadding="8" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 6px;">
              ${documents.map((d: any) => `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0;">
                  <a href="${d.file_url}" 
                    style="display: inline-flex; align-items: center; gap: 8px; color: #62BBC1; text-decoration: none; font-size: 14px; font-weight: 600;">
                    <span style="font-size: 20px;">📄</span>
                    <span>${d.file_name}</span>
                  </a>
                  <div style="color: #666; font-size: 11px; margin-top: 4px; margin-left: 28px;">
                    ${d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : ''} • Click to download
                  </div>
                </td>
              </tr>
              `).join('')}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">
                This itinerary was sent by <strong>Greenleaf Assurance</strong>
              </p>
              <p style="margin: 0; color: #999; font-size: 11px;">
                For questions or changes, please contact your travel coordinator.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}