import React from 'react';

export function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="rounded-2xl border border-white/[0.06] bg-neutral-950/60 p-6 space-y-4"
        >
          {/* Header row skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-20 rounded-full bg-neutral-900" />
              <div className="h-4 w-16 rounded bg-neutral-900" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-neutral-900" />
              <div className="h-7 w-7 rounded-lg bg-neutral-900" />
            </div>
          </div>

          {/* Content lines skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-neutral-900" />
            <div className="h-4 w-full rounded bg-neutral-900/80" />
            <div className="h-4 w-2/3 rounded bg-neutral-900/60" />
          </div>

          {/* Footer skeleton */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
            <div className="h-3 w-36 rounded bg-neutral-900" />
            <div className="h-6 w-24 rounded-full bg-neutral-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
