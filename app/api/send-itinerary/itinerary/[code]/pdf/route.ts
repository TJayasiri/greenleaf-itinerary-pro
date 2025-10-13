// file: app/api/send-itinerary/itinerary/[code]/pdf/route.ts
import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Optional: lock region close to your users
// export const preferredRegion = ['sin1', 'hkg1', 'bom1']

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()

  // Build the absolute URL to your print page
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  const origin = String(base).startsWith('http') ? base : `https://${base}`
  const url = `${origin}/itinerary/${encodeURIComponent(code)}/print`

  // Executable path (Sparticuz returns a path on serverless; may be null locally)
  const execPath = (await chromium.executablePath()) || process.env.CHROME_EXECUTABLE_PATH || undefined

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: execPath,     // if undefined locally, Puppeteer will try system Chrome
    headless: true,               // ✅ don’t read from chromium.* to avoid TS issues
  })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 })
    // small buffer if your print page hydrates client data
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