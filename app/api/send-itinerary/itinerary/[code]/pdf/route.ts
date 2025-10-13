// file: app/api/send-itinerary/itinerary/[code]/pdf/route.ts
import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// export const preferredRegion = ['sin1'] // optional

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()

  // Build absolute URL to the print view
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  const origin = String(base).startsWith('http') ? base : `https://${base}`
  const url = `${origin}/itinerary/${encodeURIComponent(code)}/print`

  // Sparticuz provides an executable path on serverless; fall back to local Chrome if needed
  const execPath =
    (await chromium.executablePath()) || process.env.CHROME_EXECUTABLE_PATH || undefined

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: execPath,
    headless: true, // <- do NOT read from chromium.headless (types differ)
  })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 })

    // Give the client-side print page a beat to hydrate (Supabase, etc.)
    await sleep(400)
    // Or use a deterministic hook if you add one:
    // await page.waitForSelector('.print-ready', { timeout: 5000 })

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      preferCSSPageSize: true,
    })

    // NextResponse expects a BodyInit; wrap the Uint8Array
    const blob = new Blob([pdfUint8], { type: 'application/pdf' })

    return new NextResponse(blob, {
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