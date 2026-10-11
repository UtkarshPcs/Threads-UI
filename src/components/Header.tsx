'use client';

import React, { useState } from 'react';
import { RefreshCw, Play, CheckCircle2, AlertCircle, Clock, ExternalLink, Info, X, Copy, Check } from 'lucide-react';
import type { BackendStatus } from '@/lib/types';
import { copyText } from '@/lib/utils';

interface HeaderProps {
  backendStatus: BackendStatus | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onRunCron?: () => Promise<void>;
}

export function Header({ backendStatus, isRefreshing, onRefresh, onRunCron }: HeaderProps) {
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const handleCopy = async (key: string, text: string) => {
    const success = await copyText(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const isOnline = backendStatus?.online === true;
  const isPending = backendStatus === null;

  return (
    <>
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
            <button
              onClick={() => setShowStatusModal(true)}
              title="Click to view backend connection & environment variable status"
              className={`flex items-center space-x-2 rounded-full border px-2.5 py-1 text-[11px] transition-all hover:border-white/30 ${
                isOnline
                  ? 'border-white/10 bg-neutral-950/80 text-neutral-300'
                  : isPending
                  ? 'border-white/10 bg-neutral-950/80 text-neutral-400'
                  : 'border-white/20 bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isOnline ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                  </>
                ) : isPending ? (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neutral-400 animate-pulse"></span>
                ) : (
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neutral-400"></span>
                )}
              </span>
              <span className="font-mono">
                {isOnline
                  ? (backendStatus?.service || 'MCP Online')
                  : isPending
                  ? 'Connecting...'
                  : 'Disconnected (Setup Env)'}
              </span>
              <Info className="h-3 w-3 text-neutral-400" />
            </button>

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

      {/* Backend Connection & Environment Variables Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel relative flex flex-col w-full max-w-xl rounded-3xl border border-white/15 bg-neutral-950/95 shadow-modal p-6 space-y-5 animate-slide-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-white' : 'bg-neutral-500'}`} />
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Backend Connection & Environment Setup
                </h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="rounded-lg border border-white/10 p-1 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Connection Status */}
            <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/60 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Connection Status:</span>
                <span className="font-mono font-medium text-white">
                  {isOnline ? 'Active & Healthy' : 'Disconnected / Unreachable'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Target Backend URL:</span>
                <span className="font-mono text-neutral-300">
                  {backendStatus?.apiUrl || 'http://127.0.0.1:3000'}
                </span>
              </div>
              {backendStatus?.error && (
                <div className="pt-2 border-t border-white/[0.06] text-neutral-400">
                  <span className="text-neutral-300 font-semibold block mb-0.5">Reported Error:</span>
                  <p className="font-mono text-[11px] bg-black/60 p-2 rounded-lg text-neutral-300">
                    {backendStatus.error}
                  </p>
                </div>
              )}
            </div>

            {/* Setup Instructions for Vercel vs Local */}
            <div className="space-y-3 text-xs">
              <h4 className="font-semibold text-white tracking-tight">
                Are you deploying on Vercel?
              </h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                In cloud deployments like Vercel, the UI cannot reach <code className="text-neutral-200">http://localhost:3000</code>.
                Add these environment variables to your <strong>Vercel Project Settings &rarr; Environment Variables</strong>:
              </p>

              <div className="space-y-2 font-mono text-[11px]">
                {/* Var 1: THREADS_MCP_URL */}
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/70 p-2.5">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">BACKEND URL (Recommended)</span>
                    <span className="text-white">THREADS_MCP_URL</span>
                    <span className="text-neutral-400 block text-[10px] mt-0.5">https://your-threads-mcp.vercel.app</span>
                  </div>
                  <button
                    onClick={() => handleCopy('url', 'THREADS_MCP_URL')}
                    className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'url' ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Var 2: FIREBASE_PROJECT_ID */}
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/70 p-2.5">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">DIRECT FIRESTORE FALLBACK</span>
                    <span className="text-white">FIREBASE_PROJECT_ID</span>
                    <span className="text-neutral-400 block text-[10px] mt-0.5">threads-log-f1545</span>
                  </div>
                  <button
                    onClick={() => handleCopy('pid', 'FIREBASE_PROJECT_ID')}
                    className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'pid' ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Var 3: FIREBASE_API_KEY */}
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/70 p-2.5">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">FIRESTORE WEB API KEY</span>
                    <span className="text-white">FIREBASE_API_KEY</span>
                    <span className="text-neutral-400 block text-[10px] mt-0.5">From your Firebase Console</span>
                  </div>
                  <button
                    onClick={() => handleCopy('apikey', 'FIREBASE_API_KEY')}
                    className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 text-neutral-400 hover:text-white"
                  >
                    {copiedKey === 'apikey' ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-white/[0.08]">
              <span className="text-[11px] text-neutral-400">
                Running locally? Open <span className="font-mono text-white">http://localhost:3001</span>
              </span>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  onRefresh();
                }}
                className="rounded-xl border border-white/20 bg-white text-black px-4 py-1.5 text-xs font-semibold hover:bg-neutral-200 transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
