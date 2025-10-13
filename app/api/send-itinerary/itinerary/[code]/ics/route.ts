// file: app/api/itinerary/[code]/ics/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------- ICS utils ----------
const CRLF = '\r\n'

function escICS(input: unknown): string {
  return String(input ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDateValue(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function toUTCDateTime(dateStr: string, timeStr = '00:00'): string {
  // Parse date and time, assume UTC to avoid timezone issues
  const [hh = 0, mm = 0] = timeStr.split(':').map(Number)
  const d = new Date(dateStr)
  d.setUTCHours(hh, mm, 0, 0)
  
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function nowUTC(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function safeUID(...parts: Array<string | number | undefined>) {
  return escICS(parts.filter(Boolean).join('-')) + '@greenleafassurance.com'
}

function buildICS(itin: any): string {
  let ics = ''
  ics += 'BEGIN:VCALENDAR' + CRLF
  ics += 'VERSION:2.0' + CRLF
  ics += 'PRODID:-//Greenleaf Assurance//Itinerary//EN' + CRLF
  ics += 'CALSCALE:GREGORIAN' + CRLF
  ics += 'METHOD:PUBLISH' + CRLF

  const dtstamp = nowUTC()

  // 1) Trip window as all-day event
  if (itin?.start_date && itin?.end_date) {
    const start = new Date(itin.start_date)
    const end = new Date(itin.end_date)
    const endPlus1 = new Date(end)
    endPlus1.setDate(endPlus1.getDate() + 1)

    ics += 'BEGIN:VEVENT' + CRLF
    ics += `UID:${safeUID(itin.code, 'trip')}` + CRLF
    ics += `DTSTAMP:${dtstamp}` + CRLF
    ics += `DTSTART;VALUE=DATE:${toDateValue(start)}` + CRLF
    ics += `DTEND;VALUE=DATE:${toDateValue(endPlus1)}` + CRLF
    ics += `SUMMARY:${escICS(itin.doc_title || 'Business Trip')}` + CRLF
    ics += `DESCRIPTION:${escICS(
      `${itin.purpose || 'Business travel'}\\nCode: ${itin.code || ''}\\nTraveler: ${itin.participants || ''}`
    )}` + CRLF
    ics += 'END:VEVENT' + CRLF
  }

  // 2) Flights
  const flights: any[] = Array.isArray(itin?.flights) ? itin.flights : []
  flights.forEach((f, idx) => {
    if (!f?.date || !f?.dep) return

    const summary = `✈️ ${escICS(f.flight || 'Flight')}: ${escICS(f.from || '')} → ${escICS(f.to || '')}`
    const dtStart = toUTCDateTime(f.date, f.dep)
    
    // Arrival time or +2h fallback
    let dtEnd: string
    if (f.arr) {
      dtEnd = toUTCDateTime(f.date, f.arr)
    } else {
      const dep = new Date(f.date)
      const [dh = 0, dm = 0] = f.dep.split(':').map(Number)
      dep.setUTCHours(dh, dm, 0, 0)
      const arr = new Date(dep.getTime() + 2 * 60 * 60 * 1000)
      dtEnd = `${arr.getUTCFullYear()}${pad(arr.getUTCMonth() + 1)}${pad(arr.getUTCDate())}T${pad(
        arr.getUTCHours()
      )}${pad(arr.getUTCMinutes())}${pad(arr.getUTCSeconds())}Z`
    }

    ics += 'BEGIN:VEVENT' + CRLF
    ics += `UID:${safeUID(itin.code, 'flight', idx)}` + CRLF
    ics += `DTSTAMP:${dtstamp}` + CRLF
    ics += `DTSTART:${dtStart}` + CRLF
    ics += `DTEND:${dtEnd}` + CRLF
    ics += `SUMMARY:${summary}` + CRLF
    if (f.booking_ref) ics += `DESCRIPTION:${escICS(`PNR: ${f.booking_ref}`)}` + CRLF
    if (f.from) ics += `LOCATION:${escICS(`${f.from} Airport`)}` + CRLF
    ics += 'END:VEVENT' + CRLF
  })

  // 3) Site visits
  const visits: any[] = Array.isArray(itin?.visits) ? itin.visits : []
  visits.forEach((v, idx) => {
    if (!v?.date) return
    ics += 'BEGIN:VEVENT' + CRLF
    ics += `UID:${safeUID(itin.code, 'visit', idx)}` + CRLF
    ics += `DTSTAMP:${dtstamp}` + CRLF
    ics += `DTSTART:${toUTCDateTime(v.date, '09:00')}` + CRLF
    ics += `DTEND:${toUTCDateTime(v.date, '17:00')}` + CRLF
    ics += `SUMMARY:${escICS(`📍 Visit: ${v.facility || v.activity || 'Site Visit'}`)}` + CRLF
    if (v.activity) ics += `DESCRIPTION:${escICS(v.activity)}${v.transport ? escICS(`\\nTransport: ${v.transport}`) : ''}` + CRLF
    if (v.address) ics += `LOCATION:${escICS(v.address)}` + CRLF
    ics += 'END:VEVENT' + CRLF
  })

  // 4) Accommodation
  const accommodation: any[] = Array.isArray(itin?.accommodation) ? itin.accommodation : []
  accommodation.forEach((h, idx) => {
    if (!h?.checkin || !h?.checkout) return
    
    const checkinDate = new Date(h.checkin)
    const checkoutDate = new Date(h.checkout)
    checkoutDate.setDate(checkoutDate.getDate() + 1) // All-day event, exclusive end

    ics += 'BEGIN:VEVENT' + CRLF
    ics += `UID:${safeUID(itin.code, 'hotel', idx)}` + CRLF
    ics += `DTSTAMP:${dtstamp}` + CRLF
    ics += `DTSTART;VALUE=DATE:${toDateValue(checkinDate)}` + CRLF
    ics += `DTEND;VALUE=DATE:${toDateValue(checkoutDate)}` + CRLF
    ics += `SUMMARY:${escICS(`🏨 ${h.hotel_name || 'Hotel'}`)}` + CRLF
    
    let desc = ''
    if (h.confirmation) desc += `Confirmation: ${h.confirmation}\\n`
    if (h.phone) desc += `Phone: ${h.phone}`
    if (desc) ics += `DESCRIPTION:${escICS(desc)}` + CRLF
    
    if (h.address) ics += `LOCATION:${escICS(h.address)}` + CRLF
    ics += 'END:VEVENT' + CRLF
  })

  // 5) Ground transport
  const transport: any[] = Array.isArray(itin?.transport) ? itin.transport : []
  transport.forEach((t, idx) => {
    if (!t?.pickup_time) return
    
    // Try to extract date from pickup_time or use trip start date
    let pickupDate = itin.start_date
    if (t.pickup_date) {
      pickupDate = t.pickup_date
    }
    
    if (!pickupDate) return

    ics += 'BEGIN:VEVENT' + CRLF
    ics += `UID:${safeUID(itin.code, 'transport', idx)}` + CRLF
    ics += `DTSTAMP:${dtstamp}` + CRLF
    ics += `DTSTART:${toUTCDateTime(pickupDate, t.pickup_time)}` + CRLF
    ics += `DTEND:${toUTCDateTime(pickupDate, t.pickup_time)}` + CRLF // Duration 0 for pickup
    ics += `SUMMARY:${escICS(`🚗 ${t.type || 'Transport'} - ${t.company || 'Pickup'}`)}` + CRLF
    
    let desc = ''
    if (t.confirmation) desc += `Confirmation: ${t.confirmation}\\n`
    if (t.notes) desc += t.notes
    if (desc) ics += `DESCRIPTION:${escICS(desc)}` + CRLF
    
    if (t.pickup_location) ics += `LOCATION:${escICS(t.pickup_location)}` + CRLF
    ics += 'END:VEVENT' + CRLF
  })

  ics += 'END:VCALENDAR' + CRLF
  return ics
}

// ---------- GET handler ----------
export async function GET(_: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()

  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
  }

  const ics = buildICS(data)

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${code}.ics"`,
      'Cache-Control': 'no-cache',
    },
  })
}