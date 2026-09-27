import { NextResponse } from 'next/server';

/**
 * Permanent document links printed into invoice PDFs (https://arvelo.ee/d/<token>).
 * The backend resolves the token and redirects to a short-lived signed URL of
 * the PDF exactly as it was sent.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return new NextResponse('Dokumenti ei leitud / Document not found', { status: 404 });
  }
  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return NextResponse.redirect(`${api}/api/public/d/${token}`, 302);
}
