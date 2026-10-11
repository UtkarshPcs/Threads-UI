import { NextResponse } from 'next/server';
import { fetchAllPosts } from '@/lib/server-api';
import type { FeedMetrics, FeedFilter, SortOption } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get('filter') || 'all') as FeedFilter;
    const sort = (searchParams.get('sort') || 'time_desc') as SortOption;

    const allPosts = await fetchAllPosts();

    // Compute metrics over ALL posts before filtering
    const metrics: FeedMetrics = {
      total: allPosts.length,
      scheduled: allPosts.filter((p) => p.status === 'scheduled').length,
      published: allPosts.filter((p) => p.status === 'published').length,
      publishing: allPosts.filter((p) => p.status === 'publishing').length,
      failed: allPosts.filter((p) => p.status === 'failed').length,
      draft: allPosts.filter((p) => p.status === 'draft').length,
      nextScheduledPost: allPosts.find((p) => p.status === 'scheduled') || null,
      lastPublishedPost: allPosts.find((p) => p.status === 'published') || null,
    };

    // Filter
    let filtered = allPosts;
    if (filter !== 'all') {
      filtered = allPosts.filter((p) => p.status === filter);
    }

    // Sort
    if (sort === 'time_asc') {
      filtered.sort((a, b) => {
        const timeA = new Date(a.scheduledFor || a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.scheduledFor || b.publishedAt || b.createdAt).getTime();
        return timeA - timeB;
      });
    } else if (sort === 'time_desc') {
      filtered.sort((a, b) => {
        const timeA = new Date(a.scheduledFor || a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.scheduledFor || b.publishedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      metrics,
      posts: filtered,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to fetch posts',
        posts: [],
      },
      { status: 500 }
    );
  }
}
