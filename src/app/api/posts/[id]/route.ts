import { NextRequest, NextResponse } from 'next/server';
import { deletePost, updatePost } from '@/lib/server-api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const url = new URL(req.url);
    const source = url.searchParams.get('source') || undefined;

    const result = await deletePost(id, source);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message, id });
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Failed to delete post.' },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error during post deletion.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const source = body.source || (id.startsWith('sched_') ? 'scheduled_thread' : 'ai_draft');

    const result = await updatePost(id, source, body);

    if (result.success) {
      return NextResponse.json({ ...result });
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Failed to update post.' },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error during post update.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
