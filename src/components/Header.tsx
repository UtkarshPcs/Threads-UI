'use client';

import React, { useState } from 'react';
import { RefreshCw, Play, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import type { BackendStatus } from '@/lib/types';

interface HeaderProps {
  backendStatus: BackendStatus | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onRunCron?: () => Promise<void>;
}

export function Header({ backendStatus, isRefreshing, onRefresh, onRunCron }: HeaderProps) {
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  const handleCron = async () => {
    if (!onRunCron || isRunningCron) return;
    setIsRunningCron(true);
    setCronFeedback(null);
    try {
      await onRunCron();
      setCronFeedback('Due queue checked');
      setTimeout(() => setCronFeedback(null), 3000);
    } catch {
      setCronFeedback('Check failed');
      setTimeout(() => setCronFeedback(null), 3000);
    } finally {
      setIsRunningCron(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-neutral-900/90 shadow-inner">
            <span className="font-mono text-base font-bold tracking-tighter text-white">@</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">
                THREADS CONTENT
              </h1>
              <span className="hidden rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 sm:inline-block">
                DRAFTS & QUEUE
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              Connected to Threads MCP Backend • Tracking Scheduled & Published Posts
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Backend Status Pill */}
          <div className="flex items-center space-x-2 rounded-full border border-white/10 bg-neutral-950/80 px-2.5 py-1 text-[11px]">
            <span className="relative flex h-2 w-2">
              {backendStatus?.online ? (
                <>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </>
              ) : (
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neutral-500"></span>
              )}
            </span>
            <span className="hidden font-mono text-neutral-300 sm:inline">
              {backendStatus?.online ? (backendStatus.service || 'MCP Online') : 'Connecting...'}
            </span>
          </div>

          {/* Trigger Scheduled Queue Runner */}
          {onRunCron && (
            <button
              onClick={handleCron}
              disabled={isRunningCron}
              title="Check and trigger any scheduled posts that have reached their target time"
              className="group flex items-center space-x-1.5 rounded-lg border border-white/10 bg-neutral-900/60 px-2.5 py-1.5 text-xs text-neutral-300 transition-all hover:border-white/20 hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            >
              <Play className={`h-3 w-3 ${isRunningCron ? 'animate-pulse text-white' : 'text-neutral-400'}`} />
              <span className="hidden sm:inline font-medium">Check Queue</span>
              {cronFeedback && (
                <span className="text-[10px] text-neutral-400 ml-1 font-mono">({cronFeedback})</span>
              )}
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 rounded-lg border border-white/15 bg-white text-black px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:bg-neutral-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
