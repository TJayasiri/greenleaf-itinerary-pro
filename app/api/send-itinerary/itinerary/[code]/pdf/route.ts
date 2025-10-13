// file: app/api/send-itinerary/itinerary/[code]/pdf/route.ts
import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()

  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  const origin = String(base).startsWith('http') ? base : `https://${base}`
  const url = `${origin}/itinerary/${encodeURIComponent(code)}/print`

  const execPath =
    (await chromium.executablePath()) || process.env.CHROME_EXECUTABLE_PATH || undefined

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: execPath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 })
    await sleep(400) // small buffer for client hydration (Supabase, etc.)

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      preferCSSPageSize: true,
    })

    // ✅ Create a fresh ArrayBuffer (not SharedArrayBuffer) and copy bytes
    const body = new ArrayBuffer(pdfUint8.byteLength)
    new Uint8Array(body).set(pdfUint8)

    return new NextResponse(body, {
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