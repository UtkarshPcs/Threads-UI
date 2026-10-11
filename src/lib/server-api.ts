import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { UnifiedPost, PostSegment, PostStatus, BackendStatus } from './types';
import { extractFirstLine } from './utils';

function getNormalizedMcpUrl(): string {
  let url = process.env.THREADS_MCP_URL || fallbackEnv.THREADS_MCP_URL || 'http://127.0.0.1:3000';
  url = url.trim().replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'chatgpt-user';

/**
 * Loads backend environment variables from Log MCP/.env if not already present in process.env.
 */
function loadBackendEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '../Log MCP/.env'),
      path.resolve(process.cwd(), '../../Log MCP/.env'),
    ];

    for (const p of envPaths) {
      if (existsSync(p)) {
        const content = readFileSync(p, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!result[key] && !process.env[key]) {
              result[key] = val;
            }
          }
        }
      }
    }
  } catch {
    // Ignore error
  }
  return result;
}

const fallbackEnv = loadBackendEnv();

function getEnv(key: string): string | undefined {
  return process.env[key] || fallbackEnv[key];
}

/**
 * Checks the status of the Threads MCP backend.
 */
export async function checkBackendStatus(): Promise<BackendStatus> {
  const baseUrl = getNormalizedMcpUrl();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(2500),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        service: data.name || data.service || 'Threads MCP',
        version: data.version || '2.0.0',
        apiUrl: baseUrl,
        checkedAt: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    // Fallback: check if Firestore is configured directly
    const hasFirebase = Boolean(getEnv('FIREBASE_PROJECT_ID') && getEnv('FIREBASE_API_KEY'));
    if (hasFirebase) {
      return {
        online: true,
        service: 'Direct Firestore Integration',
        version: '2.0.0 (Direct)',
        apiUrl: 'Cloud Firestore',
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      online: false,
      apiUrl: baseUrl,
      checkedAt: new Date().toISOString(),
      error: err.message || 'Cannot connect to MCP backend',
    };
  }

  return {
    online: false,
    apiUrl: baseUrl,
    checkedAt: new Date().toISOString(),
    error: 'Backend returned unhealthy response',
  };
}

// ============================================================================
// Direct Firestore REST API Fallback
// ============================================================================

function fromFirestoreFields(fields: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(val);
  }
  return result;
}

function fromFirestoreValue(val: Record<string, any> = {}): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((v: any) => fromFirestoreValue(v));
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue?.fields || {});
  }
  return null;
}

async function fetchFromFirestoreRest(collection: string, userId: string = DEFAULT_USER_ID): Promise<any[]> {
  const projectId = getEnv('FIREBASE_PROJECT_ID');
  const apiKey = getEnv('FIREBASE_API_KEY');

  if (!projectId || !apiKey) return [];

  try {
    // 1. Try direct collection
    let url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(userId)}/${encodeURIComponent(collection)}?pageSize=100&key=${encodeURIComponent(apiKey)}`;
    let res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });

    // 2. If 403 / 404, fallback to logs collection
    if (res.status === 403 || res.status === 404) {
      url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(userId)}/logs?pageSize=100&key=${encodeURIComponent(apiKey)}`;
      res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    }

    if (!res.ok) return [];

    const data = (await res.json()) as { documents?: Array<{ name: string; fields?: Record<string, any> }> };
    if (!data.documents || !Array.isArray(data.documents)) return [];

    return data.documents.map((doc) => {
      const parts = doc.name.split('/');
      const id = parts[parts.length - 1] || '';
      const raw = fromFirestoreFields(doc.fields || {});
      return { id, ...raw };
    });
  } catch {
    return [];
  }
}

// ============================================================================
// Normalization Helpers
// ============================================================================

function normalizeScheduledThread(item: any): UnifiedPost {
  const postsArray: PostSegment[] = (item.posts || []).map((p: any, idx: number) => {
    const text = typeof p === 'string' ? p : (p.text || '');
    return {
      index: idx + 1,
      text,
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      characterCount: text.length,
    };
  });

  const primaryContent = postsArray[0]?.text || '';
  const firstLine = extractFirstLine(primaryContent);
  const totalCharacters = postsArray.reduce((acc, p) => acc + p.characterCount, 0);

  // Status mapping
  let status: PostStatus = 'scheduled';
  if (item.status === 'published') status = 'published';
  else if (item.status === 'publishing') status = 'publishing';
  else if (item.status === 'failed') status = 'failed';
  else if (item.status === 'scheduled') status = 'scheduled';

  // Public URL
  let publicUrl = item.publishedUrls?.[0];
  if (!publicUrl && item.publishedPostIds?.[0]) {
    publicUrl = `https://www.threads.net/post/${item.publishedPostIds[0]}`;
  }

  return {
    id: item.id,
    source: 'scheduled_thread',
    status,
    isThread: postsArray.length > 1,
    postCount: postsArray.length,
    posts: postsArray,
    primaryContent,
    firstLine,
    totalCharacters,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    scheduledFor: item.scheduledFor,
    scheduledForLocal: item.scheduledForLocal,
    publishedAt: item.publishedAt,
    timeZone: item.timeZone || 'Asia/Kolkata',
    publicUrl,
    publishedUrls: item.publishedUrls,
    publishedPostIds: item.publishedPostIds,
    error: item.error,
    rawType: item.type || 'scheduled_thread',
  };
}

function normalizePublishingEvent(item: any): UnifiedPost {
  const postsArray: PostSegment[] = (item.posts || []).map((p: any, idx: number) => {
    const text = typeof p === 'string' ? p : (p.text || '');
    return {
      index: idx + 1,
      text,
      postId: p.postId,
      url: p.url,
      status: p.status,
      characterCount: text.length,
    };
  });

  const primaryContent = postsArray[0]?.text || '';
  const firstLine = extractFirstLine(primaryContent);
  const totalCharacters = postsArray.reduce((acc, p) => acc + p.characterCount, 0);

  let status: PostStatus = 'published';
  if (item.status === 'failed') status = 'failed';
  else if (item.status === 'publishing') status = 'publishing';
  else if (item.status === 'scheduled') status = 'scheduled';

  const publicUrl = postsArray[0]?.url || (postsArray[0]?.postId ? `https://www.threads.net/post/${postsArray[0].postId}` : undefined);

  return {
    id: item.id,
    source: 'publishing_history',
    status,
    isThread: Boolean(item.isThread || postsArray.length > 1),
    postCount: postsArray.length,
    posts: postsArray,
    primaryContent,
    firstLine,
    totalCharacters,
    createdAt: item.publishedAt || new Date().toISOString(),
    updatedAt: item.publishedAt || new Date().toISOString(),
    publishedAt: item.publishedAt,
    publicUrl,
    publishedUrls: postsArray.map((p) => p.url).filter(Boolean) as string[],
    publishedPostIds: postsArray.map((p) => p.postId).filter(Boolean) as string[],
    rawType: 'publishing_event',
  };
}

function normalizeAIDraft(item: any): UnifiedPost {
  const rawPosts: string[] = Array.isArray(item.posts) ? item.posts : [];
  const postsArray: PostSegment[] = rawPosts.map((p: string, idx: number) => ({
    index: idx + 1,
    text: p,
    characterCount: p.length,
  }));

  const primaryContent = postsArray[0]?.text || '';
  const firstLine = extractFirstLine(primaryContent);
  const totalCharacters = postsArray.reduce((acc, p) => acc + p.characterCount, 0);

  let status: PostStatus = 'draft';
  if (item.status === 'approved_scheduled') status = 'scheduled';
  else if (item.status === 'published') status = 'published';
  else if (item.status === 'failed') status = 'failed';

  return {
    id: item.id,
    source: 'ai_draft',
    status,
    isThread: postsArray.length > 1,
    postCount: postsArray.length,
    posts: postsArray,
    primaryContent,
    firstLine,
    totalCharacters,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    scheduledFor: item.scheduledFor || item.suggestedTime,
    publishedAt: item.publishedAt,
    sources: item.sources,
    suggestedReason: item.suggestedReason,
    error: item.error,
    rawType: 'ai_draft',
  };
}

// ============================================================================
// Core Fetch All Unified Posts
// ============================================================================

export async function fetchAllPosts(userId: string = DEFAULT_USER_ID): Promise<UnifiedPost[]> {
  const baseUrl = getNormalizedMcpUrl();
  let scheduledData: any[] = [];
  let historyData: any[] = [];
  let draftsData: any[] = [];
  let backendResponded = false;

  // 1. Try MCP Server REST Endpoints
  try {
    const [schedRes, histRes, draftsRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/scheduled?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      }),
      fetch(`${baseUrl}/api/history?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      }),
      fetch(`${baseUrl}/api/drafts?userId=${encodeURIComponent(userId)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      }),
    ]);

    if (schedRes.status === 'fulfilled' && schedRes.value.ok) {
      const data = await schedRes.value.json();
      scheduledData = data.scheduled || [];
      backendResponded = true;
    }

    if (histRes.status === 'fulfilled' && histRes.value.ok) {
      const data = await histRes.value.json();
      historyData = data.history || [];
      backendResponded = true;
    }

    if (draftsRes.status === 'fulfilled' && draftsRes.value.ok) {
      const data = await draftsRes.value.json();
      draftsData = data.drafts || [];
      backendResponded = true;
    }
  } catch {
    backendResponded = false;
  }

  // 2. If Backend didn't respond or returned empty, query Firestore directly
  if (!backendResponded || (scheduledData.length === 0 && historyData.length === 0 && draftsData.length === 0)) {
    try {
      const [directSched, directHist, directDrafts] = await Promise.all([
        fetchFromFirestoreRest('scheduled_threads', userId),
        fetchFromFirestoreRest('publishing_history', userId),
        fetchFromFirestoreRest('ai_drafts', userId),
      ]);

      if (directSched.length > 0) {
        scheduledData = directSched.filter((d) => d.id.startsWith('sched_') || d.type === 'scheduled_thread');
      }
      if (directHist.length > 0) {
        historyData = directHist.filter((d) => d.id.startsWith('pub_') || d.type === 'publishing_event');
      }
      if (directDrafts.length > 0) {
        draftsData = directDrafts.filter((d) => d.id.startsWith('draft_') || d.type === 'ai_draft');
      }
    } catch {
      // Ignore fallback failure
    }
  }

  // 3. Normalize all items
  const normalized: UnifiedPost[] = [];
  const seenIds = new Set<string>();

  // Scheduled Threads
  for (const item of scheduledData) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      normalized.push(normalizeScheduledThread(item));
    }
  }

  // Publishing Events
  for (const item of historyData) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      normalized.push(normalizePublishingEvent(item));
    }
  }

  // AI Drafts
  for (const item of draftsData) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      normalized.push(normalizeAIDraft(item));
    }
  }

  // 4. Sort chronologically:
  // Upcoming scheduled posts first (by scheduledFor asc), followed by published posts (by publishedAt desc)
  normalized.sort((a, b) => {
    // If both are scheduled, sort closest upcoming first
    if (a.status === 'scheduled' && b.status === 'scheduled') {
      const timeA = new Date(a.scheduledFor || a.createdAt).getTime();
      const timeB = new Date(b.scheduledFor || b.createdAt).getTime();
      return timeA - timeB;
    }
    // If a is scheduled, put ahead of published/draft
    if (a.status === 'scheduled') return -1;
    if (b.status === 'scheduled') return 1;

    // Both are published, failed, or drafts: sort newest timestamp first
    const timeA = new Date(a.publishedAt || a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.publishedAt || b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  return normalized;
}

/**
 * Triggers publication check for due scheduled threads.
 */
export async function triggerScheduledCron(): Promise<any> {
  const baseUrl = getNormalizedMcpUrl();
  try {
    const res = await fetch(`${baseUrl}/api/cron/publish-scheduled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, error: `Cron trigger failed: ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
