import React from 'react';
import { Layers, Search, RefreshCw } from 'lucide-react';
import type { FeedFilter } from '@/lib/types';

interface EmptyStateProps {
  filter: FeedFilter;
  hasSearch: boolean;
  onReset: () => void;
}

export function EmptyState({ filter, hasSearch, onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-neutral-950/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-neutral-900/60 text-neutral-400 mb-4">
        {hasSearch ? <Search className="h-6 w-6" /> : <Layers className="h-6 w-6" />}
      </div>

      <h3 className="text-base font-semibold text-white tracking-tight">
        {hasSearch
          ? 'No matching posts found'
          : filter === 'all'
          ? 'No posts recorded yet'
          : `No ${filter} posts found`}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs text-neutral-400 leading-relaxed">
        {hasSearch
          ? 'Try adjusting your search terms or clearing the search filter.'
          : filter === 'scheduled'
          ? 'No posts are currently queued for scheduled publication in your Threads MCP backend.'
          : filter === 'published'
          ? 'No posts have been marked as published in your Threads history yet.'
          : 'Nothing matches this status filter in your Threads pipeline.'}
      </p>

      <div className="mt-5">
        <button
          onClick={onReset}
          className="inline-flex items-center space-x-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-white hover:text-black"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  );
}
