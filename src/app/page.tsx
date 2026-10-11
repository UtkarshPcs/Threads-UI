'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { MetricsOverview } from '@/components/MetricsOverview';
import { StatusFilters } from '@/components/StatusFilters';
import { PostCard } from '@/components/PostCard';
import { PostDetailModal } from '@/components/PostDetailModal';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import type { UnifiedPost, FeedMetrics, FeedFilter, SortOption, BackendStatus } from '@/lib/types';
import { Calendar, CheckCircle2, Sparkles, Clock, Layers } from 'lucide-react';

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

  // Selected post for detail modal inspection
  const [inspectingPost, setInspectingPost] = useState<UnifiedPost | null>(null);

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

      setPosts(data.posts || []);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
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
    const res = await fetch('/api/cron', { method: 'POST' });
    const data = await res.json();
    // Refresh posts after cron run
    await loadPosts(true);
  };

  useEffect(() => {
    loadPosts();
    loadBackendStatus();
  }, [loadPosts, loadBackendStatus]);

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
        return matchLead || matchSegments || matchId;
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
    const others = displayPosts.filter((p) => p.status !== 'scheduled' && p.status !== 'publishing' && p.status !== 'published');
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
            <span>FEATURE 01</span>
            <span>•</span>
            <span className="text-neutral-300">CONTENT DRAFTS & QUEUE TRACKER</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Threads Content Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
            One unified workspace to track your Threads posts from scheduling to live publication.
            Inspect full thread chains, verify intended target dates, and open live public posts directly on Threads.
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
                        onInspect={(p) => setInspectingPost(p)}
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
                        onInspect={(p) => setInspectingPost(p)}
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
                        Drafts & Review ({otherItems.length})
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {otherItems.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onInspect={(p) => setInspectingPost(p)}
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
                  onInspect={(p) => setInspectingPost(p)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Post Detail Inspection Modal */}
      <PostDetailModal
        post={inspectingPost}
        onClose={() => setInspectingPost(null)}
      />

      {/* Minimal Editorial Footer */}
      <footer className="mt-auto border-t border-white/[0.06] bg-neutral-950/60 py-6 text-center text-xs text-neutral-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Threads MCP Studio • Post Drafts Tracking System</span>
          <span className="font-mono text-[11px]">Meta Threads API Integration</span>
        </div>
      </footer>
    </div>
  );
}
