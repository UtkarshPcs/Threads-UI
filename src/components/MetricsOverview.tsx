'use client';

import React from 'react';
import { Calendar, CheckCircle, Clock, FileText, Layers, AlertTriangle } from 'lucide-react';
import type { FeedMetrics } from '@/lib/types';
import { formatExactDateTime, formatRelativeTime } from '@/lib/utils';

interface MetricsOverviewProps {
  metrics: FeedMetrics;
  onSelectFilter?: (filter: 'scheduled' | 'published' | 'draft' | 'all') => void;
}

export function MetricsOverview({ metrics, onSelectFilter }: MetricsOverviewProps) {
  const nextScheduled = metrics.nextScheduledPost;
  const lastPublished = metrics.lastPublishedPost;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {/* 1. Scheduled Queue */}
      <div
        onClick={() => onSelectFilter?.('scheduled')}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/70 p-4 transition-all duration-200 hover:border-white/25 hover:bg-neutral-900/60"
      >
        <div className="absolute top-0 right-0 h-16 w-16 bg-white/[0.02] blur-xl" />
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono uppercase tracking-wider text-[11px]">Scheduled</span>
          <Calendar className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white transition-colors" />
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
            {metrics.scheduled}
          </span>
          <span className="text-[11px] text-neutral-400">queued</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400 line-clamp-1">
          {nextScheduled?.scheduledFor ? (
            <span className="text-neutral-300">
              Next: <span className="text-white font-mono">{formatRelativeTime(nextScheduled.scheduledFor)}</span>
            </span>
          ) : (
            <span>No upcoming queue</span>
          )}
        </div>
      </div>

      {/* 2. Published Live */}
      <div
        onClick={() => onSelectFilter?.('published')}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/70 p-4 transition-all duration-200 hover:border-white/25 hover:bg-neutral-900/60"
      >
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono uppercase tracking-wider text-[11px]">Published</span>
          <CheckCircle className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white transition-colors" />
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
            {metrics.published}
          </span>
          <span className="text-[11px] text-neutral-400">live</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400 line-clamp-1">
          {lastPublished?.publishedAt ? (
            <span className="text-neutral-300">
              Latest: <span className="text-white font-mono">{formatRelativeTime(lastPublished.publishedAt)}</span>
            </span>
          ) : (
            <span>None published yet</span>
          )}
        </div>
      </div>

      {/* 3. In Flight / Review / Drafts */}
      <div
        onClick={() => onSelectFilter?.('draft')}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/70 p-4 transition-all duration-200 hover:border-white/25 hover:bg-neutral-900/60"
      >
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono uppercase tracking-wider text-[11px]">Drafts & Review</span>
          <FileText className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white transition-colors" />
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
            {metrics.draft + metrics.publishing}
          </span>
          {metrics.publishing > 0 && (
            <span className="rounded bg-white/10 px-1 py-0.5 text-[10px] text-white animate-pulse">
              {metrics.publishing} publishing
            </span>
          )}
        </div>
        <div className="mt-2 text-[11px] text-neutral-400">
          {metrics.failed > 0 ? (
            <span className="text-neutral-300 flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3 inline text-neutral-400" />
              <span>{metrics.failed} failed</span>
            </span>
          ) : (
            <span>All workflows clean</span>
          )}
        </div>
      </div>

      {/* 4. Total Posts Pipeline */}
      <div
        onClick={() => onSelectFilter?.('all')}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/70 p-4 transition-all duration-200 hover:border-white/25 hover:bg-neutral-900/60"
      >
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono uppercase tracking-wider text-[11px]">Total Tracked</span>
          <Layers className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white transition-colors" />
        </div>
        <div className="mt-2.5 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-mono">
            {metrics.total}
          </span>
          <span className="text-[11px] text-neutral-400">records</span>
        </div>
        <div className="mt-2 text-[11px] text-neutral-400">
          Threads MCP v2.0
        </div>
      </div>
    </div>
  );
}
