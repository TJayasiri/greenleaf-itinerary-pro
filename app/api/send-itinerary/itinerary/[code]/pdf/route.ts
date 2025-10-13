// file: app/api/itinerary/[code]/pdf/route.ts
import { NextResponse } from 'next/server'
import { chromium } from 'playwright'

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  const origin = String(base).startsWith('http') ? base : `https://${base}`
  const url = `${origin}/itinerary/${encodeURIComponent(code)}/print`

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    // Wait a tick in case Supabase client hydrates late
    await page.waitForTimeout(400)

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    })

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${code}.pdf"`,
      },
    })
  } finally {
    await browser.close()
  }
}