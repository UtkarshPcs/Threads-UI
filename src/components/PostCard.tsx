'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trash2,
  Tag,
  ImageIcon,
  Edit3,
} from 'lucide-react';
import type { UnifiedPost } from '@/lib/types';
import { formatExactDateTime, formatRelativeTime, getStatusMeta, copyText } from '@/lib/utils';

interface PostCardProps {
  post: UnifiedPost;
  onInspect: (post: UnifiedPost) => void;
  onRequestDelete: (post: UnifiedPost) => void;
}

export function PostCard({ post, onInspect, onRequestDelete }: PostCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const statusMeta = getStatusMeta(post.status);
  const hasMedia = Boolean(post.posts[0]?.mediaUrl || post.mediaUrls?.[0]);
  const mediaUrl = post.posts[0]?.mediaUrl || post.mediaUrls?.[0];
  const topicTag = post.topicTag || post.posts[0]?.topicTag;

  // Copy primary or public URL
  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = post.publicUrl || (post.posts[0]?.text ?? post.primaryContent);
    const success = await copyText(target);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopySegment = async (text: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyText(text);
    if (success) {
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <article
      onClick={() => onInspect(post)}
      className="glass-card group relative cursor-pointer overflow-hidden rounded-2xl p-5 sm:p-6 transition-all"
    >
      {/* Top Border Subtle Highlight */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-white/[0.06]">
        {/* Status Pill & Relative Timing */}
        <div className="flex items-center space-x-2.5">
          <span
            className={`inline-flex items-center space-x-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight ${statusMeta.badgeBg} ${statusMeta.badgeBorder} ${statusMeta.badgeText}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotColor}`} />
            <span>{statusMeta.label}</span>
          </span>

          {/* Timing preview */}
          {post.status === 'scheduled' && post.scheduledFor && (
            <span className="text-[11px] font-mono text-neutral-300">
              {formatRelativeTime(post.scheduledFor)}
            </span>
          )}
          {post.status === 'published' && post.publishedAt && (
            <span className="text-[11px] font-mono text-neutral-400">
              {formatRelativeTime(post.publishedAt)}
            </span>
          )}
        </div>

        {/* Right Badges & Actions */}
        <div className="flex items-center space-x-2">
          {post.isThread && (
            <span className="flex items-center space-x-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono text-neutral-300">
              <Layers className="h-3 w-3 text-neutral-400" />
              <span>{post.postCount} Posts</span>
            </span>
          )}

          {/* Topic Tag Pill */}
          {topicTag && (
            <span className="flex items-center space-x-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono text-neutral-300">
              <Tag className="h-3 w-3 text-neutral-400" />
              <span>#{topicTag}</span>
            </span>
          )}

          {/* Media Indicator */}
          {hasMedia && (
            <span
              title="Has attached media"
              className="flex items-center space-x-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-neutral-300"
            >
              <ImageIcon className="h-3 w-3 text-neutral-300" />
            </span>
          )}

          {/* Copy Action */}
          <button
            onClick={handleCopyLink}
            title={post.publicUrl ? 'Copy public Threads URL' : 'Copy post content'}
            className="rounded-lg border border-white/[0.08] bg-neutral-900/60 p-1.5 text-neutral-400 transition-colors hover:border-white/20 hover:bg-neutral-800 hover:text-white"
          >
            {isCopied ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Public Link Action */}
          {post.publicUrl && (
            <a
              href={post.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open post on Threads.net"
              className="rounded-lg border border-white/[0.08] bg-neutral-900/60 p-1.5 text-neutral-400 transition-colors hover:border-white/20 hover:bg-neutral-800 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          {/* Delete Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(post);
            }}
            title="Delete post"
            className="rounded-lg border border-white/[0.08] bg-neutral-900/60 p-1.5 text-neutral-400 transition-colors hover:border-white/30 hover:bg-neutral-800 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="py-4 space-y-3">
        {/* Post #1 Lead Content */}
        <div className="text-neutral-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap selection:bg-white selection:text-black">
          {post.primaryContent}
        </div>

        {/* Media Thumbnail Preview */}
        {hasMedia && mediaUrl && (
          <div className="pt-1">
            <div className="relative inline-block max-w-sm rounded-xl overflow-hidden border border-white/10 bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt="Post media"
                className="max-h-48 w-auto object-cover rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Multi-Post Chain Accordion Preview */}
        {post.isThread && post.posts.length > 1 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex items-center space-x-1.5 rounded-lg border border-white/10 bg-neutral-950/70 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-all hover:border-white/25 hover:bg-neutral-900 hover:text-white"
            >
              <span>{isExpanded ? 'Hide replies in thread' : `View remaining ${post.posts.length - 1} thread replies`}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2.5 border-l-2 border-white/15 pl-4 sm:pl-5">
                {post.posts.slice(1).map((segment, idx) => (
                  <div
                    key={segment.index || idx + 2}
                    className="group/seg relative rounded-xl border border-white/[0.06] bg-neutral-950/50 p-3.5 transition-colors hover:border-white/15"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                      <span>Post #{segment.index || idx + 2}</span>
                      <button
                        onClick={(e) => handleCopySegment(segment.text, segment.index, e)}
                        className="text-neutral-400 hover:text-white"
                      >
                        {copiedIndex === segment.index ? (
                          <Check className="h-3 w-3 text-white inline" />
                        ) : (
                          <Copy className="h-3 w-3 inline" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                      {segment.text}
                    </p>
                    {segment.url && (
                      <a
                        href={segment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-flex items-center space-x-1 text-[11px] text-neutral-400 hover:text-white underline underline-offset-2"
                      >
                        <span>View reply permalink</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Notice if Failed */}
        {post.status === 'failed' && post.error && (
          <div className="rounded-xl border border-white/20 bg-neutral-950/90 p-3 text-xs text-neutral-300 flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Publishing Error:</span> {post.error}
            </div>
          </div>
        )}
      </div>

      {/* Footer Metadata Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-white/[0.06] text-xs">
        {/* Exact Timestamp Display */}
        <div className="flex items-center space-x-2 text-neutral-400">
          {post.status === 'scheduled' ? (
            <>
              <Clock className="h-3.5 w-3.5 text-neutral-300" />
              <span>
                <strong className="text-neutral-200">Intended:</strong>{' '}
                <span className="font-mono text-neutral-300">
                  {post.scheduledForLocal || formatExactDateTime(post.scheduledFor, post.timeZone)}
                </span>
              </span>
            </>
          ) : post.status === 'published' ? (
            <>
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <span>
                <strong className="text-neutral-300">Published:</strong>{' '}
                <span className="font-mono text-neutral-300">
                  {formatExactDateTime(post.publishedAt, post.timeZone)}
                </span>
              </span>
            </>
          ) : (
            <>
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <span>
                <strong className="text-neutral-400">Recorded:</strong>{' '}
                <span className="font-mono text-neutral-400">
                  {formatExactDateTime(post.createdAt, post.timeZone)}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Interactive Action Links */}
        <div className="flex items-center space-x-2.5">
          {post.publicUrl && (
            <a
              href={post.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center space-x-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white transition-all hover:bg-white hover:text-black"
            >
              <span>View on Threads</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          <button
            onClick={() => onInspect(post)}
            className="inline-flex items-center space-x-1 rounded-full border border-white/10 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-200 transition-colors hover:border-white/30 hover:text-white"
          >
            <Edit3 className="h-3 w-3 text-neutral-400" />
            <span>Review &amp; Edit</span>
          </button>
        </div>
      </div>
    </article>
  );
}
