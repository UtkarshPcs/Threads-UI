'use client';

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  Code,
  FileText,
  Layers,
  AlertCircle,
  Share2,
} from 'lucide-react';
import type { UnifiedPost } from '@/lib/types';
import { formatExactDateTime, getStatusMeta, copyText } from '@/lib/utils';

interface PostDetailModalProps {
  post: UnifiedPost | null;
  onClose: () => void;
}

export function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'metadata'>('content');
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!post) return null;

  const statusMeta = getStatusMeta(post.status);

  const handleCopyAll = async () => {
    const fullText = post.posts.map((p, i) => `[Post ${i + 1}]\n${p.text}`).join('\n\n---\n\n');
    const success = await copyText(fullText);
    if (success) {
      setIsCopiedAll(true);
      setTimeout(() => setIsCopiedAll(false), 2000);
    }
  };

  const handleCopySegment = async (text: string, idx: number) => {
    const success = await copyText(text);
    if (success) {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/15 bg-neutral-950/90 shadow-modal overflow-hidden animate-slide-up"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center space-x-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeBg} ${statusMeta.badgeBorder} ${statusMeta.badgeText}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotColor}`} />
              <span>{statusMeta.label}</span>
            </span>
            <span className="text-xs font-mono text-neutral-400">ID: {post.id}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyAll}
              className="flex items-center space-x-1.5 rounded-lg border border-white/10 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-white/20 hover:text-white transition-all"
            >
              {isCopiedAll ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Copy All</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-neutral-900/80 p-1.5 text-neutral-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-4 px-6 border-b border-white/[0.08] bg-black/20 text-xs font-medium">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'content'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Post Breakdown ({post.postCount} {post.postCount === 1 ? 'Post' : 'Chain Items'})</span>
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-2.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'metadata'
                ? 'border-white text-white font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            <span>Raw Metadata & Timings</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'content' ? (
            <div className="space-y-4">
              {post.posts.map((segment, idx) => (
                <div
                  key={segment.index || idx + 1}
                  className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-4 transition-all hover:border-white/20"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-white">
                        Post #{segment.index || idx + 1}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {segment.characterCount} / 500 chars
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopySegment(segment.text, segment.index)}
                        className="flex items-center space-x-1 text-[11px] text-neutral-400 hover:text-white"
                      >
                        {copiedIndex === segment.index ? (
                          <>
                            <Check className="h-3 w-3 text-white" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {segment.url && (
                        <a
                          href={segment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-[11px] text-neutral-300 hover:text-white underline underline-offset-2"
                        >
                          <span>Threads Link</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-neutral-200 whitespace-pre-wrap leading-relaxed selection:bg-white selection:text-black">
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detailed Timing Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-4 text-xs">
                <div>
                  <span className="text-neutral-400 block mb-1">Status Classification</span>
                  <span className="font-mono font-medium text-white">{statusMeta.label}</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{statusMeta.description}</p>
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1">Source Pipeline</span>
                  <span className="font-mono font-medium text-white">{post.source}</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Origin collection</p>
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1">Intended Publication Time</span>
                  <span className="font-mono text-neutral-200">
                    {post.scheduledForLocal || (post.scheduledFor ? formatExactDateTime(post.scheduledFor, post.timeZone) : 'None')}
                  </span>
                  {post.scheduledFor && (
                    <span className="text-[10px] font-mono text-neutral-500 block">UTC: {post.scheduledFor}</span>
                  )}
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1">Actual Publication Time</span>
                  <span className="font-mono text-neutral-200">
                    {post.publishedAt ? formatExactDateTime(post.publishedAt, post.timeZone) : 'Not published yet'}
                  </span>
                  {post.publishedAt && (
                    <span className="text-[10px] font-mono text-neutral-500 block">UTC: {post.publishedAt}</span>
                  )}
                </div>
              </div>

              {/* Public URL Action if Available */}
              {post.publicUrl && (
                <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-4 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-neutral-400 block mb-0.5">Live Public URL</span>
                    <a
                      href={post.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-white underline underline-offset-2 break-all"
                    >
                      {post.publicUrl}
                    </a>
                  </div>
                  <a
                    href={post.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 rounded-lg border border-white/20 bg-white text-black px-3 py-1.5 text-xs font-semibold hover:bg-neutral-200 transition-colors"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* JSON Payload Inspection */}
              <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-4">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
                  <span className="font-mono text-neutral-400">Raw JSON Payload</span>
                  <button
                    onClick={() => copyText(JSON.stringify(post, null, 2))}
                    className="text-neutral-400 hover:text-white"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="max-h-60 overflow-y-auto text-[11px] font-mono text-neutral-300 leading-relaxed">
                  {JSON.stringify(post, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
