'use client';

import React from 'react';
import { Search, ArrowUpDown, SlidersHorizontal, X } from 'lucide-react';
import type { FeedFilter, SortOption, FeedMetrics } from '@/lib/types';

interface StatusFiltersProps {
  currentFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  metrics: FeedMetrics;
}

export function StatusFilters({
  currentFilter,
  onFilterChange,
  currentSort,
  onSortChange,
  searchQuery,
  onSearchChange,
  metrics,
}: StatusFiltersProps) {
  const filterOptions: Array<{ id: FeedFilter; label: string; count: number }> = [
    { id: 'all', label: 'All Content', count: metrics.total },
    { id: 'scheduled', label: 'Scheduled', count: metrics.scheduled },
    { id: 'published', label: 'Published', count: metrics.published },
    ...(metrics.publishing > 0
      ? [{ id: 'publishing' as FeedFilter, label: 'Publishing', count: metrics.publishing }]
      : []),
    ...(metrics.failed > 0
      ? [{ id: 'failed' as FeedFilter, label: 'Failed', count: metrics.failed }]
      : []),
    { id: 'draft', label: 'Drafts', count: metrics.draft },
  ];

  return (
    <div className="flex flex-col space-y-3 sm:space-y-4">
      {/* Top Bar: Search and Sort */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search post content, hooks, or thread text..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-neutral-950/80 py-2 pl-9 pr-9 text-xs text-white placeholder-neutral-500 transition-all focus:border-white/25 focus:bg-neutral-900/90 focus:outline-none focus:ring-1 focus:ring-white/20 sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 hidden sm:inline">
            Sort:
          </span>
          <select
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-xl border border-white/[0.08] bg-neutral-950/80 px-3 py-2 text-xs text-neutral-200 transition-all hover:border-white/20 focus:border-white/25 focus:outline-none cursor-pointer"
          >
            <option value="time_desc">Newest Activity (Recent first)</option>
            <option value="time_asc">Target Schedule (Earliest first)</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none sm:space-x-2">
        {filterOptions.map((opt) => {
          const isActive = currentFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onFilterChange(opt.id)}
              className={`flex items-center space-x-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs transition-all ${
                isActive
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'border border-white/[0.08] bg-neutral-950/60 text-neutral-400 hover:border-white/20 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  isActive
                    ? 'bg-black/15 text-black font-bold'
                    : 'bg-white/10 text-neutral-400'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
