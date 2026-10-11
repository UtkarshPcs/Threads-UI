'use client';

import React from 'react';
import { Trash2, AlertCircle, X, Loader2 } from 'lucide-react';
import type { UnifiedPost } from '@/lib/types';
import { getStatusMeta } from '@/lib/utils';

interface DeleteConfirmModalProps {
  post: UnifiedPost | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteConfirmModal({
  post,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmModalProps) {
  if (!isOpen || !post) return null;

  const statusMeta = getStatusMeta(post.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel relative flex flex-col w-full max-w-md rounded-2xl border border-white/15 bg-neutral-950/95 p-6 shadow-modal overflow-hidden animate-slide-up space-y-5"
      >
        {/* Subtle Top Highlight */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-neutral-900 text-white">
              <Trash2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Delete Post</h3>
              <p className="text-xs text-neutral-400 font-mono">ID: {post.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-white/10 bg-neutral-900/80 p-1.5 text-neutral-400 hover:text-white transition-all disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Badge & Post Content Excerpt */}
        <div className="rounded-xl border border-white/[0.08] bg-neutral-900/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span
              className={`inline-flex items-center space-x-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusMeta.badgeBg} ${statusMeta.badgeBorder} ${statusMeta.badgeText}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotColor}`} />
              <span>{statusMeta.label}</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-400">{post.source}</span>
          </div>

          <p className="text-xs sm:text-sm text-neutral-300 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans italic border-l-2 border-white/20 pl-2.5">
            &ldquo;{post.primaryContent}&rdquo;
          </p>
        </div>

        {/* Warning Explanatory Text */}
        <div className="flex items-start space-x-2 text-xs text-neutral-400">
          <AlertCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This will permanently remove this record from Firebase. The post cannot be recovered once deleted.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center space-x-2 rounded-xl border border-white bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5 text-black" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
