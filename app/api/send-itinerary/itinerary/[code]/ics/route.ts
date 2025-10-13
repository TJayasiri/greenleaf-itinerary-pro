// file: app/api/itinerary/[code]/ics/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase' // if you have a server client use that; else fetch via anon with RLS allowing read by code

function buildICS(itin: any) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const toICSDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Greenleaf Itinerary//EN']

  const pushEvent = (summary: string, start: Date, end: Date, desc?: string, loc?: string) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${crypto.randomUUID()}@greenleaf`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${summary.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(desc||'').replace(/\n/g,' ')}`,
      `LOCATION:${(loc||'').replace(/\n/g,' ')}`,
      'END:VEVENT'
    )
  }

  // Flights
  if (Array.isArray(itin.flights)) {
    itin.flights.forEach((f: any) => {
      const date = new Date(f.date)
      const [dh, dm] = String(f.dep||'00:00').split(':').map(Number)
      const [ah, am] = String(f.arr||'00:00').split(':').map(Number)
      const dep = new Date(date); dep.setHours(dh||0, dm||0, 0, 0)
      const arr = new Date(date); arr.setHours(ah||0, am||0, 0, 0)
      pushEvent(`Flight ${f.flight}: ${f.from} → ${f.to}`, dep, arr, f.booking_ref ? `PNR: ${f.booking_ref}` : '', `${f.from} Airport`)
    })
  }
  // Visits
  if (Array.isArray(itin.visits)) {
    itin.visits.forEach((v: any) => {
      const d = new Date(v.date)
      const start = new Date(d); start.setHours(9,0,0,0)
      const end   = new Date(d); end.setHours(17,0,0,0)
      pushEvent(`Visit: ${v.facility}`, start, end, v.activity || '', v.address || '')
    })
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export async function GET(_: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()
  const { data, error } = await supabase.from('itineraries').select('*').eq('code', code).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const ics = buildICS(data)
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${code}.ics"`,
    },
  })
}