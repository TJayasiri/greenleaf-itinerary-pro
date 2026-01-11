// File: app/api/send-itinerary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Greenleaf Assurance <noreply@greenleafassurance.com>'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://itinerary.greenleafassurance.com'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    // --- AUTHENTICATION CHECK ---
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      supabaseUrl,
      supabaseKey,
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

    // Verify user has a valid role (admin or coordinator)
    const { data: userRole, error: roleCheckError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (roleCheckError || !userRole || !['admin', 'coordinator'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Forbidden. Access denied.' }, { status: 403 })
    }

    const body = await req.json()
    const { itineraryId, email, customMessage } = body || {}

    // --- Validation ---
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (!itineraryId || typeof itineraryId !== 'string') {
      return NextResponse.json({ error: 'Invalid itinerary ID' }, { status: 400 })
    }

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    // --- Initialize clients ---
    const supabase = createClient(supabaseUrl, supabaseKey)
    const resend = new Resend(resendApiKey)

    // --- Fetch itinerary ---
    // Also verify the user owns the itinerary or is admin
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', itineraryId)
      .single()

    if (itineraryError || !itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Authorization: Check if user owns the itinerary or is admin
    if (itinerary.created_by !== currentUser.id && userRole.role !== 'admin') {
      return NextResponse.json({ error: 'You do not have permission to send this itinerary' }, { status: 403 })
    }

    // --- Fetch linked documents ---
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('itinerary_id', itineraryId)

    // --- Compose email content ---
    const html = generateEmailHtml(itinerary, documents || [], customMessage)

    // --- Send email ---
    const sanitizedEmail = email.trim().toLowerCase()
    const { data, error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: [sanitizedEmail],
      subject: `Your Travel Itinerary: ${itinerary.doc_title || itinerary.code}`,
      html,
    })

    if (sendError) {
      return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { id: data?.id } })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Build structured HTML + JSON-LD travel data for Gmail/TripIt/Outlook
 */
function generateEmailHtml(itinerary: any, documents: any[], customMessage?: string) {
  const lookupUrl = `${appUrl}/?code=${encodeURIComponent(itinerary.code)}`
  const flights = itinerary.flights || []
  const hotels = itinerary.accommodation || []
  const tz = itinerary.timezone || '+07:00'

  // --- Structured data blocks (separate per entity) ---
  const structuredBlocks: string[] = []

  flights.forEach((f: any) => {
    structuredBlocks.push(JSON.stringify({
      '@context': 'http://schema.org',
      '@type': 'FlightReservation',
      reservationNumber: f.pnr || f.eticket || 'TBD',
      reservationStatus: 'http://schema.org/Confirmed',
      underName: { '@type': 'Person', name: itinerary.participants?.split(';')[0] || 'Traveler' },
      reservationFor: {
        '@type': 'Flight',
        flightNumber: f.flight || '',
        airline: { '@type': 'Airline', name: f.airline || '', iataCode: f.airline?.substring(0, 2) || '' },
        departureAirport: { '@type': 'Airport', name: `${f.from} Airport`, iataCode: f.from || '' },
        departureTime: `${f.date}T${f.dep || '00:00'}:00${tz}`,
        arrivalAirport: { '@type': 'Airport', name: `${f.to} Airport`, iataCode: f.to || '' },
        arrivalTime: `${f.date}T${f.arr || '00:00'}:00${tz}`
      }
    }, null, 2))
  })

  hotels.forEach((h: any) => {
    structuredBlocks.push(JSON.stringify({
      '@context': 'http://schema.org',
      '@type': 'LodgingReservation',
      reservationNumber: h.confirmation || 'TBD',
      reservationStatus: 'http://schema.org/Confirmed',
      underName: { '@type': 'Person', name: itinerary.participants?.split(';')[0] || 'Traveler' },
      reservationFor: {
        '@type': 'LodgingBusiness',
        name: h.hotel_name || '',
        address: { '@type': 'PostalAddress', streetAddress: h.address || '' },
        telephone: h.phone || ''
      },
      checkinTime: `${h.checkin}T15:00:00${tz}`,
      checkoutTime: `${h.checkout}T11:00:00${tz}`
    }, null, 2))
  })

  // Escape HTML entities in user-provided content
  const escapeHtml = (str: string) => {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // --- HTML email ---
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Travel Itinerary</title>
  ${structuredBlocks.map(b => `<script type="application/ld+json">\n${b}\n</script>`).join('\n')}
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:20px;background:#f5f5f5;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#62BBC1;color:#fff;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:26px;">Your Travel Itinerary</h1>
            <p style="margin-top:8px;font-size:14px;">Reference: <strong>${escapeHtml(itinerary.code)}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:25px;background:#f8f9fa;border-left:4px solid #62BBC1;">
            <p style="margin:0 0 10px 0;font-size:16px;color:#333;">${customMessage ? escapeHtml(customMessage) : `Dear ${escapeHtml(itinerary.participants) || 'Traveler'},`}</p>
            ${!customMessage ? `
            <p style="font-size:15px;color:#333;line-height:1.5;">Your full travel itinerary for <strong>${escapeHtml(itinerary.doc_title) || 'your trip'}</strong> is ready.</p>
            <p style="font-size:15px;color:#333;">Have a safe and successful journey!</p>
            ` : ''}
            <p style="margin-top:12px;color:#666;font-size:13px;">Best regards,<br/>Greenleaf Assurance Travel Desk</p>
          </td>
        </tr>
        <tr>
          <td style="padding:25px;">
            <h2 style="margin:0 0 15px 0;color:#333;font-size:20px;border-bottom:2px solid #62BBC1;padding-bottom:8px;">
              ${escapeHtml(itinerary.doc_title) || 'Business Trip'}
            </h2>
            <table width="100%" cellpadding="6" cellspacing="0" style="margin-bottom:20px;font-size:14px;color:#333;">
              <tr><td width="140"><strong>Traveler(s):</strong></td><td>${escapeHtml(itinerary.participants) || 'N/A'}</td></tr>
              <tr><td><strong>Purpose:</strong></td><td>${escapeHtml(itinerary.purpose) || 'N/A'}</td></tr>
              <tr><td><strong>Dates:</strong></td><td>${escapeHtml(itinerary.start_date)} – ${escapeHtml(itinerary.end_date)}</td></tr>
              <tr><td><strong>Contact:</strong></td><td>${escapeHtml(itinerary.phones) || 'N/A'}</td></tr>
            </table>
            <div style="text-align:center;margin:30px 0;">
              <a href="${lookupUrl}" style="display:inline-block;background:#62BBC1;color:#fff;padding:14px 38px;border-radius:6px;text-decoration:none;font-weight:bold;">
                View Itinerary Online
              </a>
            </div>
          </td>
        </tr>

        ${flights.length > 0 ? `
        <tr><td style="padding:0 25px 25px 25px;">
          <h3 style="font-size:17px;margin-bottom:10px;color:#333;">Flight Schedule</h3>
          ${flights.map((f: any) => `
            <div style="background:#f8f9fa;border-radius:6px;padding:10px 12px;margin-bottom:8px;">
              <div style="font-weight:bold;color:#333;">${escapeHtml(f.airline) || ''} ${escapeHtml(f.flight)} (${escapeHtml(f.from)} → ${escapeHtml(f.to)})</div>
              <div style="font-size:13px;color:#555;">${escapeHtml(f.date)} | Dep ${escapeHtml(f.dep)} → Arr ${escapeHtml(f.arr)}</div>
              ${f.pnr ? `<div style="font-size:12px;color:#62BBC1;">PNR: ${escapeHtml(f.pnr)}</div>` : ''}
            </div>
          `).join('')}
        </td></tr>` : ''}

        ${hotels.length > 0 ? `
        <tr><td style="padding:0 25px 25px 25px;">
          <h3 style="font-size:17px;margin-bottom:10px;color:#333;">Accommodation</h3>
          ${hotels.map((h: any) => `
            <div style="background:#f8f9fa;border-radius:6px;padding:10px 12px;margin-bottom:8px;">
              <div style="font-weight:bold;color:#333;">${escapeHtml(h.hotel_name)}</div>
              <div style="font-size:13px;color:#555;">${escapeHtml(h.address) || ''}</div>
              <div style="font-size:13px;color:#555;">Check-in ${escapeHtml(h.checkin)} | Check-out ${escapeHtml(h.checkout)}</div>
              ${h.phone ? `<div style="font-size:13px;color:#555;">Tel: ${escapeHtml(h.phone)}</div>` : ''}
              ${h.confirmation ? `<div style="font-size:12px;color:#62BBC1;">Confirmation: ${escapeHtml(h.confirmation)}</div>` : ''}
            </div>
          `).join('')}
        </td></tr>` : ''}

        <tr>
          <td style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #e0e0e0;">
            <p style="font-size:12px;color:#777;">This itinerary was sent by <strong>Greenleaf Assurance</strong>.</p>
            <p style="font-size:11px;color:#aaa;">For assistance, contact your assigned travel coordinator.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
