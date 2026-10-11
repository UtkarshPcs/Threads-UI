'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  Code,
  FileText,
  AlertCircle,
  Smartphone,
  Tablet,
  Monitor,
  Upload,
  Image as ImageIcon,
  Trash2,
  Send,
  Save,
  Tag,
  MapPin,
  Loader2,
  Info,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
} from 'lucide-react';
import type { UnifiedPost } from '@/lib/types';
import { formatExactDateTime, getStatusMeta, copyText } from '@/lib/utils';

interface PostEditorModalProps {
  post: UnifiedPost | null;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: (updatedPost: UnifiedPost) => void;
  onPostDeleted: (postId: string) => void;
  onRequestDelete: (post: UnifiedPost) => void;
}

type ModalTab = 'edit' | 'preview' | 'metadata';
type DeviceMode = 'mobile' | 'tablet' | 'desktop';

const THREADS_CHAR_LIMIT = 500;

export function PostEditorModal({
  post,
  isOpen,
  onClose,
  onPostUpdated,
  onPostDeleted,
  onRequestDelete,
}: PostEditorModalProps) {
  if (!isOpen || !post) return null;

  return (
    <PostEditorModalContent
      key={post.id}
      post={post}
      onClose={onClose}
      onPostUpdated={onPostUpdated}
      onPostDeleted={onPostDeleted}
      onRequestDelete={onRequestDelete}
    />
  );
}

function PostEditorModalContent({
  post,
  onClose,
  onPostUpdated,
  onPostDeleted,
  onRequestDelete,
}: {
  post: UnifiedPost;
  onClose: () => void;
  onPostUpdated: (updatedPost: UnifiedPost) => void;
  onPostDeleted: (postId: string) => void;
  onRequestDelete: (post: UnifiedPost) => void;
}) {
  const [activeTab, setActiveTab] = useState<ModalTab>('edit');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('mobile');

  // Form State
  const [content, setContent] = useState<string>(post.primaryContent || '');
  const [topicTag, setTopicTag] = useState<string>(post.topicTag || post.posts[0]?.topicTag || '');
  const [mediaUrl, setMediaUrl] = useState<string>(
    post.posts[0]?.mediaUrl || post.mediaUrls?.[0] || ''
  );
  const [locationTag, setLocationTag] = useState<string>(post.location || post.posts[0]?.location || '');

  // Schedule timing state
  const initialDate = useMemo(() => {
    if (!post.scheduledFor) return '';
    try {
      const d = new Date(post.scheduledFor);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [post.scheduledFor]);

  const initialTime = useMemo(() => {
    if (!post.scheduledFor) return '';
    try {
      const d = new Date(post.scheduledFor);
      return d.toTimeString().slice(0, 5); // HH:MM
    } catch {
      return '';
    }
  }, [post.scheduledFor]);

  const [scheduleDate, setScheduleDate] = useState<string>(initialDate);
  const [scheduleTime, setScheduleTime] = useState<string>(initialTime);
  const [timeZone] = useState<string>(
    post.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  );

  // Status & Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Live Metrics
  const charCount = content.length;
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  const charsRemaining = THREADS_CHAR_LIMIT - charCount;
  const isOverLimit = charsRemaining < 0;

  const statusMeta = getStatusMeta(post.status);
  const isEditable = post.status === 'scheduled' || post.status === 'draft' || post.status === 'failed';
  const canPublishNow = post.status === 'scheduled' || post.status === 'draft';

  // Sanitize topic tag (Threads allows letters, numbers, underscores; no '#' or spaces)
  const handleTopicTagChange = (raw: string) => {
    const sanitized = raw.replace(/^#+/, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    setTopicTag(sanitized);
  };

  // Image upload via Cloudinary (/api/upload)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image to Cloudinary');
      }

      setMediaUrl(data.url);
      setStatusMessage({ type: 'success', text: 'Image uploaded and attached successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Image upload failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Save changes to Firebase
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      // Calculate new scheduled timestamp if date and time provided
      let newScheduledFor = post.scheduledFor;
      let newScheduledLocal = post.scheduledForLocal;

      if (scheduleDate && scheduleTime) {
        const dateObj = new Date(`${scheduleDate}T${scheduleTime}:00`);
        if (!isNaN(dateObj.getTime())) {
          newScheduledFor = dateObj.toISOString();
          newScheduledLocal = `${scheduleDate} ${scheduleTime} (${timeZone})`;
        }
      }

      // Construct payload
      const updatedSegments = (post.posts.length > 0 ? post.posts : [{ index: 1, text: content }]).map(
        (seg, idx) => (idx === 0 ? { ...seg, text: content, mediaUrl: mediaUrl || undefined, topicTag: topicTag || undefined } : seg)
      );

      const payload = {
        text: content,
        posts: updatedSegments,
        scheduledFor: newScheduledFor,
        scheduledTime: scheduleTime,
        scheduledDate: scheduleDate,
        timeZone,
        mediaUrl: mediaUrl || '',
        topicTag: topicTag || '',
        location: locationTag || '',
        source: post.source,
      };

      const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to save post changes');
      }

      // Update local post state
      const updatedPost: UnifiedPost = {
        ...post,
        primaryContent: content,
        scheduledFor: newScheduledFor,
        scheduledForLocal: newScheduledLocal,
        timeZone,
        topicTag: topicTag || undefined,
        location: locationTag || undefined,
        mediaUrls: mediaUrl ? [mediaUrl] : [],
        posts: updatedSegments.map((s) => ({
          ...s,
          characterCount: s.text.length,
          wordCount: s.text.trim() === '' ? 0 : s.text.trim().split(/\s+/).length,
        })),
      };

      onPostUpdated(updatedPost);
      setStatusMessage({ type: 'success', text: 'Changes saved to Firebase successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving post.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Now action
  const handlePublishNow = async () => {
    const confirmed = window.confirm(
      'Publish this post immediately to Threads? This will post directly to your Threads profile and cancel any scheduled publishing job.'
    );
    if (!confirmed) return;

    setIsPublishing(true);
    setStatusMessage(null);

    try {
      // First save any unsaved text/image changes
      if (isEditable) {
        await handleSaveChanges();
      }

      const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: post.source }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish post immediately.');
      }

      const publishedPost: UnifiedPost = {
        ...post,
        status: 'published',
        publishedAt: new Date().toISOString(),
        publicUrl: data.data?.permalink || data.data?.publicUrl || post.publicUrl,
        primaryContent: content,
      };

      onPostUpdated(publishedPost);
      setStatusMessage({ type: 'success', text: 'Post published successfully to Threads!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Publication error.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyText = async () => {
    const success = await copyText(content);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-white/15 bg-neutral-950/95 shadow-modal overflow-hidden animate-slide-up"
      >
        {/* Subtle Top Highlight */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Modal Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08] bg-black/50">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center space-x-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeBg} ${statusMeta.badgeBorder} ${statusMeta.badgeText}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotColor}`} />
              <span>{statusMeta.label}</span>
            </span>
            <span className="text-xs font-mono text-neutral-400">ID: {post.id}</span>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2">
            {/* Direct Threads Link if published */}
            {post.publicUrl && (
              <a
                href={post.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 rounded-lg border border-white/15 bg-neutral-900/80 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition-all"
              >
                <span>View Live</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {/* Delete Trigger */}
            <button
              onClick={() => onRequestDelete(post)}
              title="Delete this post permanently"
              className="flex items-center space-x-1.5 rounded-lg border border-white/10 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-400 hover:border-white/30 hover:text-white transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopyText}
              className="flex items-center space-x-1.5 rounded-lg border border-white/10 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-white/20 hover:text-white transition-all"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Copy</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-neutral-900/80 p-1.5 text-neutral-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab & Device Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 border-b border-white/[0.08] bg-black/20 text-xs font-medium">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('edit')}
              className={`py-3 border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'edit'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Review & Editor</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'preview'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Live Device Preview</span>
            </button>

            <button
              onClick={() => setActiveTab('metadata')}
              className={`py-3 border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'metadata'
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Metadata & Details</span>
            </button>
          </div>

          {/* Device Switcher (Shown when Preview tab is active) */}
          {activeTab === 'preview' && (
            <div className="flex items-center space-x-1 py-1.5 bg-neutral-900/80 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                  deviceMode === 'mobile'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span>Mobile (375px)</span>
              </button>
              <button
                onClick={() => setDeviceMode('tablet')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                  deviceMode === 'tablet'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Tablet className="h-3 w-3" />
                <span>Tablet (640px)</span>
              </button>
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                  deviceMode === 'desktop'
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span>Desktop</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Message Feedback Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-white/10 border-white/20 text-neutral-100'
                : 'bg-neutral-900 border-white/20 text-neutral-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-white shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-neutral-400 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: REVIEW & EDIT */}
          {activeTab === 'edit' && (
            <div className="space-y-6">
              {/* Textarea Editor with Live Word/Char Counter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-white tracking-tight">Post Content</label>
                  {/* Word & Character Counter */}
                  <div className="flex items-center space-x-3 font-mono text-[11px]">
                    <span className="text-neutral-400">
                      Words: <strong className="text-white font-mono">{wordCount}</strong>
                    </span>
                    <span className="text-neutral-500">•</span>
                    <span className={isOverLimit ? 'text-white font-bold underline' : 'text-neutral-300'}>
                      Chars: <strong className="font-mono">{charCount}</strong> / {THREADS_CHAR_LIMIT}
                    </span>
                    <span className="text-neutral-500">•</span>
                    <span
                      className={`font-mono font-medium ${
                        charsRemaining < 0
                          ? 'text-white underline decoration-white font-bold'
                          : charsRemaining <= 50
                          ? 'text-neutral-300'
                          : 'text-neutral-400'
                      }`}
                    >
                      {charsRemaining >= 0 ? `${charsRemaining} left` : `${Math.abs(charsRemaining)} over limit`}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!isEditable}
                    rows={8}
                    placeholder="What is happening on Threads?"
                    className={`w-full rounded-2xl border bg-black/60 p-4 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none transition-all leading-relaxed font-sans ${
                      isOverLimit
                        ? 'border-white focus:border-white focus:ring-1 focus:ring-white'
                        : 'border-white/15 focus:border-white/40 focus:ring-1 focus:ring-white/20'
                    } ${!isEditable ? 'opacity-80 cursor-not-allowed' : ''}`}
                  />
                </div>

                {/* Over Limit Warning */}
                {isOverLimit && (
                  <div className="flex items-start space-x-2 rounded-xl border border-white/30 bg-neutral-900/90 p-3 text-xs text-neutral-200">
                    <AlertCircle className="h-4 w-4 text-white shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Character Limit Exceeded:</span> Threads supports a
                      maximum of 500 characters per post. Your text is currently {charCount} characters ({Math.abs(charsRemaining)} over).
                      Please shorten before publishing.
                    </div>
                  </div>
                )}
              </div>

              {/* Grid: Image Upload & Topic Tag Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Image Upload / Attachment */}
                <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 text-neutral-300" />
                      <span className="text-xs font-semibold text-white">Media Attachment</span>
                    </div>
                    {mediaUrl && (
                      <button
                        type="button"
                        onClick={() => setMediaUrl('')}
                        disabled={!isEditable}
                        className="text-[11px] text-neutral-400 hover:text-white transition-colors"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {mediaUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl}
                        alt="Attached media"
                        className="w-full max-h-48 object-cover rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-neutral-900 border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-neutral-800"
                        >
                          View Full
                        </a>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => setMediaUrl('')}
                            className="rounded-lg bg-neutral-900 border border-white/20 px-3 py-1.5 text-xs text-neutral-300 hover:text-white"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/40 p-5 text-center cursor-pointer hover:border-white/40 transition-colors">
                        <Upload className="h-6 w-6 text-neutral-400 mb-2" />
                        <span className="text-xs text-neutral-200 font-medium">
                          {isUploading ? 'Uploading to Cloudinary...' : 'Upload Image (PNG, JPG)'}
                        </span>
                        <span className="text-[10px] text-neutral-500 mt-1">
                          Hosted securely on Cloudinary and attached to post
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={!isEditable || isUploading}
                          className="hidden"
                        />
                      </label>

                      {/* Direct URL input fallback */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="url"
                          placeholder="Or paste public image URL..."
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          disabled={!isEditable}
                          className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Topic Tag & Location Tag */}
                <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-4 space-y-4">
                  {/* Topic Tag */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-4 w-4 text-neutral-300" />
                        <span className="text-xs font-semibold text-white">Threads Topic Tag</span>
                      </div>
                      {topicTag && (
                        <span className="text-[11px] font-mono text-neutral-400">#{topicTag}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. artificialintelligence (no '#' or spaces)"
                      value={topicTag}
                      onChange={(e) => handleTopicTagChange(e.target.value)}
                      disabled={!isEditable}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-white/30 font-mono"
                    />
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Official Meta Threads tag rule: 1 tag per post, alphanumeric/underscores only. Do not type &#35;.
                    </p>
                  </div>

                  {/* Location Tagging (Documented Meta API Limitation) */}
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-neutral-400" />
                      <span className="text-xs font-semibold text-white">Location Tagging</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400">
                        Meta API Restricted
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Location metadata note"
                      value={locationTag}
                      onChange={(e) => setLocationTag(e.target.value)}
                      disabled={!isEditable}
                      className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-white/30"
                    />
                    <div className="rounded-lg border border-white/[0.08] bg-black/40 p-2 text-[10px] text-neutral-400 leading-relaxed flex items-start space-x-1.5">
                      <Info className="h-3.5 w-3.5 text-neutral-300 shrink-0 mt-0.5" />
                      <span>
                        <strong>API Constraint:</strong> Threads location tagging requires Meta App Review permission
                        (<code>threads_location_tagging</code>) &amp; numeric Facebook Place IDs. Plain text locations are
                        not attached to public threads.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Timing Adjustment (Updates real Firebase scheduler) */}
              {isEditable && (
                <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-neutral-300" />
                      <span className="text-xs font-semibold text-white">Publishing Schedule Timing</span>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">Time Zone: {timeZone}</span>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Changing the date or time here updates the actual scheduler in Firebase, ensuring your automated job
                    publishes the post at the adjusted time.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Target Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-white/30 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Target Time (24h)</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-white/30 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE DEVICE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              {/* Mandatory Disclaimer */}
              <div className="w-full max-w-xl rounded-xl border border-white/15 bg-neutral-900/80 px-4 py-2.5 text-center text-xs text-neutral-300 flex items-center justify-center space-x-2">
                <Info className="h-4 w-4 text-white shrink-0" />
                <span>
                  <strong>Preview Note:</strong> Approximation of Threads rendering, not an exact replica. Line breaks, media, and layout simulated.
                </span>
              </div>

              {/* Responsive Device Container */}
              <div
                className={`transition-all duration-300 ease-in-out w-full border border-white/15 bg-black rounded-3xl p-5 sm:p-6 shadow-2xl relative ${
                  deviceMode === 'mobile'
                    ? 'max-w-[375px]'
                    : deviceMode === 'tablet'
                    ? 'max-w-[580px]'
                    : 'max-w-[680px]'
                }`}
              >
                {/* Device Frame Notch/Header Indicator */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08] text-[11px] text-neutral-400 font-mono">
                  <span className="flex items-center space-x-1.5">
                    {deviceMode === 'mobile' && <Smartphone className="h-3.5 w-3.5" />}
                    {deviceMode === 'tablet' && <Tablet className="h-3.5 w-3.5" />}
                    {deviceMode === 'desktop' && <Monitor className="h-3.5 w-3.5" />}
                    <span className="uppercase">{deviceMode} View</span>
                  </span>
                  <span>Threads Preview</span>
                </div>

                {/* Simulated Threads Post Item */}
                <div className="flex items-start space-x-3.5">
                  {/* Avatar Icon */}
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full border border-white/20 bg-neutral-900 flex items-center justify-center text-white font-bold text-sm">
                      @
                    </div>
                  </div>

                  {/* Post Content Body */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Header Handle and Timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-white text-xs sm:text-sm tracking-tight">
                          chatgpt-user
                        </span>
                        <span className="text-[11px] text-neutral-500">•</span>
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {post.scheduledFor ? 'scheduled' : 'now'}
                        </span>
                      </div>
                      <span className="text-neutral-500 text-xs">•••</span>
                    </div>

                    {/* Post Text with True Line Breaks */}
                    <p className="text-xs sm:text-sm text-neutral-100 whitespace-pre-wrap leading-relaxed break-words font-sans selection:bg-white selection:text-black">
                      {content || <span className="text-neutral-600 italic">No content typed yet...</span>}
                    </p>

                    {/* Attached Image Preview */}
                    {mediaUrl && (
                      <div className="rounded-2xl overflow-hidden border border-white/10 bg-neutral-950 mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaUrl}
                          alt="Threads post visual"
                          className="w-full max-h-96 object-cover"
                        />
                      </div>
                    )}

                    {/* Topic Tag Pill */}
                    {topicTag && (
                      <div className="pt-1">
                        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-mono text-neutral-300">
                          #{topicTag}
                        </span>
                      </div>
                    )}

                    {/* Simulated Threads Interactive Bar */}
                    <div className="flex items-center space-x-5 pt-2 text-neutral-400">
                      <button className="flex items-center space-x-1 hover:text-white transition-colors">
                        <Heart className="h-4 w-4" />
                      </button>
                      <button className="flex items-center space-x-1 hover:text-white transition-colors">
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button className="flex items-center space-x-1 hover:text-white transition-colors">
                        <Repeat2 className="h-4 w-4" />
                      </button>
                      <button className="flex items-center space-x-1 hover:text-white transition-colors">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: METADATA & RAW DETAILS */}
          {activeTab === 'metadata' && (
            <div className="space-y-5">
              {/* Timing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-white/[0.08] bg-neutral-900/40 p-4 text-xs">
                <div>
                  <span className="text-neutral-400 block mb-1">Status Classification</span>
                  <span className="font-mono font-medium text-white">{statusMeta.label}</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{statusMeta.description}</p>
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1">Origin Collection</span>
                  <span className="font-mono font-medium text-white">{post.source}</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Firebase document path</p>
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1">Scheduled Target</span>
                  <span className="font-mono text-neutral-200">
                    {post.scheduledForLocal || (post.scheduledFor ? formatExactDateTime(post.scheduledFor, post.timeZone) : 'None')}
                  </span>
                  {post.scheduledFor && (
                    <span className="text-[10px] font-mono text-neutral-500 block">UTC: {post.scheduledFor}</span>
                  )}
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1">Published Timestamp</span>
                  <span className="font-mono text-neutral-200">
                    {post.publishedAt ? formatExactDateTime(post.publishedAt, post.timeZone) : 'Not published'}
                  </span>
                  {post.publishedAt && (
                    <span className="text-[10px] font-mono text-neutral-500 block">UTC: {post.publishedAt}</span>
                  )}
                </div>
              </div>

              {/* JSON Payload Inspection */}
              <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-4">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
                  <span className="font-mono text-neutral-400">Raw Post Object</span>
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

        {/* Modal Bottom Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.08] bg-black/50">
          <div className="text-xs text-neutral-400 font-mono">
            {isEditable ? 'Editing enabled' : 'Archived / Read-only'}
          </div>

          <div className="flex items-center space-x-3">
            {/* Publish Now Button (for scheduled/draft) */}
            {canPublishNow && (
              <button
                type="button"
                onClick={handlePublishNow}
                disabled={isPublishing || isSaving || isOverLimit}
                className="inline-flex items-center space-x-2 rounded-xl border border-white/20 bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 hover:border-white/40 transition-all disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 text-white" />
                    <span>Publish Now</span>
                  </>
                )}
              </button>
            )}

            {/* Save Changes Button */}
            {isEditable && (
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving || isPublishing || isOverLimit}
                className="inline-flex items-center space-x-2 rounded-xl border border-white bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 text-black" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            )}

            {!isEditable && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/20 bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-all"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
