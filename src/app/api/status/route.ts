import { NextResponse } from 'next/server';
import { checkBackendStatus } from '@/lib/server-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const status = await checkBackendStatus();
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Status check failed',
        status: { online: false, apiUrl: '', checkedAt: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
