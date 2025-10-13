// file: app/api/send-itinerary/itinerary/[code]/pdf/route.ts
import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'           // required (NOT edge)
export const dynamic = 'force-dynamic'    // this route is dynamic

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()

  // Build the absolute URL for your print page
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  const origin = String(base).startsWith('http') ? base : `https://${base}`
  const url = `${origin}/itinerary/${encodeURIComponent(code)}/print`

  // Chromium config for serverless
  const execPath = await chromium.executablePath()
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: execPath,
    headless: chromium.headless,
  })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 })
    // tiny delay to let Supabase client finish hydrating if needed
    await page.waitForTimeout(400)

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      preferCSSPageSize: true,
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