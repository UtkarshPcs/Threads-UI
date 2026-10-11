export type PostStatus = 'scheduled' | 'published' | 'publishing' | 'failed' | 'draft';

export interface PostSegment {
  index: number;
  text: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  postId?: string;
  url?: string;
  status?: string;
  characterCount: number;
}

export interface UnifiedPost {
  id: string;
  source: 'scheduled_thread' | 'publishing_history' | 'ai_draft';
  status: PostStatus;
  isThread: boolean;
  postCount: number;
  posts: PostSegment[];
  primaryContent: string;
  firstLine: string;
  totalCharacters: number;
  
  // Timing
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;      // Intended publication time (UTC ISO)
  scheduledForLocal?: string; // Intended local display string (e.g. "Friday, Oct 16, 2026, 2:06 PM IST")
  publishedAt?: string;       // Actual publication time (UTC ISO)
  timeZone?: string;

  // Public Links & Identifiers
  publicUrl?: string;         // Direct clickable link to threads.net
  publishedUrls?: string[];
  publishedPostIds?: string[];
  
  // Extra Metadata
  error?: string;
  sources?: string[];
  suggestedReason?: string;
  rawType?: string;
}

export type FeedFilter = 'all' | 'scheduled' | 'published' | 'publishing' | 'failed' | 'draft';
export type SortOption = 'time_desc' | 'time_asc' | 'created_desc';

export interface FeedMetrics {
  total: number;
  scheduled: number;
  published: number;
  publishing: number;
  failed: number;
  draft: number;
  nextScheduledPost?: UnifiedPost | null;
  lastPublishedPost?: UnifiedPost | null;
}

export interface BackendStatus {
  online: boolean;
  service?: string;
  version?: string;
  apiUrl: string;
  checkedAt: string;
  error?: string;
}
