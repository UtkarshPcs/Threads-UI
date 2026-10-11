'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { MetricsOverview } from '@/components/MetricsOverview';
import { StatusFilters } from '@/components/StatusFilters';
import { PostCard } from '@/components/PostCard';
import { PostEditorModal } from '@/components/PostEditorModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import type { UnifiedPost, FeedMetrics, FeedFilter, SortOption, BackendStatus } from '@/lib/types';
import { Clock, CheckCircle2, Layers, AlertCircle } from 'lucide-react';

function computeMetrics(postList: UnifiedPost[]): FeedMetrics {
  const scheduled = postList.filter((p) => p.status === 'scheduled').length;
  const published = postList.filter((p) => p.status === 'published').length;
  const publishing = postList.filter((p) => p.status === 'publishing').length;
  const failed = postList.filter((p) => p.status === 'failed').length;
  const draft = postList.filter((p) => p.status === 'draft').length;

  const scheduledPosts = postList
    .filter((p) => p.status === 'scheduled' && p.scheduledFor)
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());

  const publishedPosts = postList
    .filter((p) => p.status === 'published' && p.publishedAt)
    .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());

  return {
    total: postList.length,
    scheduled,
    published,
    publishing,
    failed,
    draft,
    nextScheduledPost: scheduledPosts[0] || null,
    lastPublishedPost: publishedPosts[0] || null,
  };
}

export default function PostDraftsPage() {
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [metrics, setMetrics] = useState<FeedMetrics>({
    total: 0,
    scheduled: 0,
    published: 0,
    publishing: 0,
    failed: 0,
    draft: 0,
    nextScheduledPost: null,
    lastPublishedPost: null,
  });

  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [currentFilter, setCurrentFilter] = useState<FeedFilter>('all');
  const [currentSort, setCurrentSort] = useState<SortOption>('time_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Post Editor & Detail Modal State
  const [editingPost, setEditingPost] = useState<UnifiedPost | null>(null);

  // Post Deletion Confirmation State
  const [deletingPost, setDeletingPost] = useState<UnifiedPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch posts from API route
  const loadPosts = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts?filter=all&sort=${currentSort}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load posts from Threads pipeline');
      }

      const fetchedPosts: UnifiedPost[] = data.posts || [];
      setPosts(fetchedPosts);
      setMetrics(data.metrics || computeMetrics(fetchedPosts));
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Threads backend');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentSort]);

  // Check Backend Status
  const loadBackendStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setBackendStatus(data.status);
      }
    } catch {
      setBackendStatus({
        online: false,
        apiUrl: '',
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  // Run Cron publishing check
  const handleRunCron = async () => {
    await fetch('/api/cron', { method: 'POST' });
    await loadPosts(true);
  };

  useEffect(() => {
    loadPosts();
    loadBackendStatus();
  }, [loadPosts, loadBackendStatus]);

  // Handle post update (e.g. from editor or publish now)
  const handlePostUpdated = (updated: UnifiedPost) => {
    setPosts((prev) => {
      const nextList = prev.map((p) => (p.id === updated.id ? updated : p));
      setMetrics(computeMetrics(nextList));
      return nextList;
    });

    if (editingPost?.id === updated.id) {
      setEditingPost(updated);
    }
  };

  // Handle individual post deletion
  const handleConfirmDelete = async () => {
    if (!deletingPost) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/posts/${encodeURIComponent(deletingPost.id)}?source=${encodeURIComponent(deletingPost.source)}`,
        { method: 'DELETE' }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete post.');
      }

      // Optimistically update post list and recalculate metrics immediately
      setPosts((prev) => {
        const nextList = prev.filter((p) => p.id !== deletingPost.id);
        setMetrics(computeMetrics(nextList));
        return nextList;
      });

      // Close editing modal if deleting currently edited post
      if (editingPost?.id === deletingPost.id) {
        setEditingPost(null);
      }

      setDeletingPost(null);
    } catch (err: any) {
      alert(`Delete Error: ${err.message || 'Unable to delete post.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered and Searched Posts
  const displayPosts = useMemo(() => {
    let result = posts;

    // Filter
    if (currentFilter !== 'all') {
      result = result.filter((p) => p.status === currentFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const matchLead = p.primaryContent.toLowerCase().includes(q);
        const matchSegments = p.posts.some((seg) => seg.text.toLowerCase().includes(q));
        const matchId = p.id.toLowerCase().includes(q);
        const matchTag = p.topicTag?.toLowerCase().includes(q);
        return matchLead || matchSegments || matchId || Boolean(matchTag);
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (currentSort === 'time_asc') {
        const timeA = new Date(a.scheduledFor || a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.scheduledFor || b.publishedAt || b.createdAt).getTime();
        return timeA - timeB;
      } else {
        const timeA = new Date(a.scheduledFor || a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.scheduledFor || b.publishedAt || b.createdAt).getTime();
        return timeB - timeA;
      }
    });

    return result;
  }, [posts, currentFilter, searchQuery, currentSort]);

  // Separate upcoming queued posts vs published archive for clearer visual sectioning when 'all' is selected
  const { upcomingQueue, publishedArchive, otherItems } = useMemo(() => {
    const upcoming = displayPosts.filter((p) => p.status === 'scheduled' || p.status === 'publishing');
    const published = displayPosts.filter((p) => p.status === 'published');
    const others = displayPosts.filter(
      (p) => p.status !== 'scheduled' && p.status !== 'publishing' && p.status !== 'published'
    );
    return { upcomingQueue: upcoming, publishedArchive: published, otherItems: others };
  }, [displayPosts]);

  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-100">
      {/* Sticky Header */}
      <Header
        backendStatus={backendStatus}
        isRefreshing={isRefreshing}
        onRefresh={() => {
          loadPosts(true);
          loadBackendStatus();
        }}
        onRunCron={handleRunCron}
      />

      {/* Main Content Workspace */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-7 sm:space-y-8">
        {/* Page Title & Editorial Header */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400">
            <span>WORKSPACE</span>
            <span>•</span>
            <span className="text-neutral-300">THREADS POST MANAGEMENT &amp; PUBLISHING STUDIO</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Threads Content Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
            One unified workspace to review, edit, schedule, and publish your Threads posts. Inspect live previews,
            manage attached images via Cloudinary, adjust scheduled timings, and publish instantly.
          </p>
        </div>

        {/* Error Alert if any */}
        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => {
              loadPosts();
              loadBackendStatus();
            }}
          />
        )}

        {/* Metrics Strip */}
        <MetricsOverview
          metrics={metrics}
          onSelectFilter={(f) => {
            setCurrentFilter(f as FeedFilter);
            setSearchQuery('');
          }}
        />

        {/* Status Filters, Search, and Sort */}
        <StatusFilters
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          currentSort={currentSort}
          onSortChange={setCurrentSort}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          metrics={metrics}
        />

        {/* Post Feed */}
        <div className="space-y-8">
          {isLoading ? (
            <LoadingSkeleton />
          ) : backendStatus?.online === false && posts.length === 0 ? (
            <div className="rounded-3xl border border-white/15 bg-neutral-950/80 p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-neutral-900 text-white">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Backend Connection Setup Required</h3>
              <p className="max-w-md mx-auto text-xs text-neutral-400 leading-relaxed">
                The interface cannot reach your Threads MCP backend (attempted:{' '}
                <span className="font-mono text-neutral-200">{backendStatus?.apiUrl || 'http://127.0.0.1:3000'}</span>).
                <br />
                <br />
                If deployed on <strong>Vercel</strong>, ensure <code className="text-white bg-neutral-900 px-1 py-0.5 rounded">THREADS_MCP_URL</code> or{' '}
                <code className="text-white bg-neutral-900 px-1 py-0.5 rounded">FIREBASE_PROJECT_ID</code> &amp;{' '}
                <code className="text-white bg-neutral-900 px-1 py-0.5 rounded">FIREBASE_API_KEY</code> are configured.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    loadPosts(true);
                    loadBackendStatus();
                  }}
                  className="rounded-xl border border-white/20 bg-white text-black px-4 py-2 text-xs font-semibold hover:bg-neutral-200 transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          ) : displayPosts.length === 0 ? (
            <EmptyState
              filter={currentFilter}
              hasSearch={Boolean(searchQuery)}
              onReset={() => {
                setCurrentFilter('all');
                setSearchQuery('');
              }}
            />
          ) : currentFilter === 'all' && !searchQuery ? (
            // Grouped Section View for "All"
            <div className="space-y-10">
              {/* 1. Upcoming Scheduled Queue */}
              {upcomingQueue.length > 0 && (
                <section className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-neutral-300" />
                      <h3 className="text-sm font-semibold tracking-tight text-white uppercase font-mono">
                        Upcoming Scheduled Queue ({upcomingQueue.length})
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-400 font-mono">
                      Target dates in local time
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {upcomingQueue.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onInspect={(p) => setEditingPost(p)}
                        onRequestDelete={(p) => setDeletingPost(p)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 2. Published Live Posts */}
              {publishedArchive.length > 0 && (
                <section className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-neutral-300" />
                      <h3 className="text-sm font-semibold tracking-tight text-white uppercase font-mono">
                        Published to Threads ({publishedArchive.length})
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-400 font-mono">
                      Live on Threads.net
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {publishedArchive.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onInspect={(p) => setEditingPost(p)}
                        onRequestDelete={(p) => setDeletingPost(p)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 3. Drafts or Others */}
              {otherItems.length > 0 && (
                <section className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-neutral-400" />
                      <h3 className="text-sm font-semibold tracking-tight text-white uppercase font-mono">
                        Drafts &amp; Review ({otherItems.length})
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {otherItems.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onInspect={(p) => setEditingPost(p)}
                        onRequestDelete={(p) => setDeletingPost(p)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            // Flat List View for filtered or searched results
            <div className="grid grid-cols-1 gap-4">
              {displayPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onInspect={(p) => setEditingPost(p)}
                  onRequestDelete={(p) => setDeletingPost(p)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Post Review, Editor, & Device Preview Modal */}
      <PostEditorModal
        post={editingPost}
        isOpen={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={(id) => {
          setPosts((prev) => {
            const next = prev.filter((p) => p.id !== id);
            setMetrics(computeMetrics(next));
            return next;
          });
          setEditingPost(null);
        }}
        onRequestDelete={(post) => setDeletingPost(post)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        post={deletingPost}
        isOpen={Boolean(deletingPost)}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Minimal Editorial Footer */}
      <footer className="mt-auto border-t border-white/[0.06] bg-neutral-950/60 py-6 text-center text-xs text-neutral-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Threads Content Pipeline • Studio Edition</span>
          <span className="font-mono text-[11px]">Direct Meta Threads API Integration</span>
        </div>
      </footer>
    </div>
  );
}
