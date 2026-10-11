import { NextResponse } from 'next/server';
import { triggerScheduledCron } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await triggerScheduledCron();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Trigger failed' },
      { status: 500 }
    );
  }
}
