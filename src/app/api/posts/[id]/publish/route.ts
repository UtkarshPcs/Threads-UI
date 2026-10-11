import { NextRequest, NextResponse } from 'next/server';
import { publishPostNow } from '@/lib/server-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable
    }

    const source = body.source || (id.startsWith('sched_') ? 'scheduled_thread' : 'ai_draft');
    const result = await publishPostNow(id, source);

    if (result.success) {
      return NextResponse.json({ ...result });
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Failed to publish post immediately.' },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error while publishing post.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
