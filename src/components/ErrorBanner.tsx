import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-neutral-950/90 p-4 text-xs text-neutral-200">
      <div className="flex items-center space-x-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div>
          <span className="font-semibold text-white block">Connection Alert</span>
          <span className="text-neutral-400">{message}</span>
        </div>
      </div>

      <button
        onClick={onRetry}
        className="flex items-center space-x-1.5 rounded-lg border border-white/20 bg-white text-black px-3 py-1.5 font-semibold text-xs transition-all hover:bg-neutral-200 active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Retry</span>
      </button>
    </div>
  );
}
