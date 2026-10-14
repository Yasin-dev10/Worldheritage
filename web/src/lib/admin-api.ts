// Shared admin API utilities and types

export type EditorialState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type PageResponse<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminCountry = {
  id: string;
  slug: string;
  isoAlpha2: string | null;
  region: string | null;
  createdAt: string;
  updatedAt: string;
  latestRevision?: {
    id: string;
    state: EditorialState;
    revisionNumber: number;
    publishedAt: string | null;
    title?: string;
    summary?: string;
  } | null;
  revisions?: Array<{
    id: string;
    state: EditorialState;
    revisionNumber: number;
    publishedAt: string | null;
    translations?: Array<{ locale: string; title: string; summary: string; body: string }>;
  }>;
};

export type AdminArticle = {
  id: string;
  slug: string;
  authorName: string;
  editorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
  state: EditorialState;
  title?: string;
  summary?: string;
};

export type AdminEvent = {
  id: string;
  slug: string;
  category: string;
  dateDisplay: string | null;
  startYear: number | null;
  endYear: number | null;
  state: EditorialState;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  title?: string;
};

export type AdminFigure = {
  id: string;
  slug: string;
  birthDateText: string | null;
  birthYear: number | null;
  deathDateText: string | null;
  deathYear: number | null;
  state: EditorialState;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  title?: string;
};

export type AdminTimeline = {
  id: string;
  slug: string;
  state: EditorialState;
  publishedAt: string | null;
  title?: string;
};

export type AdminCivilization = {
  id: string;
  slug: string;
  region: string | null;
  startYear: number | null;
  endYear: number | null;
  dateDisplay: string | null;
  state: EditorialState;
  publishedAt: string | null;
  title?: string;
};

export type ReviewQueueItem = {
  contentType: string;
  id: string;
  slug: string;
  state: EditorialState;
  title: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  actorSubject: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type ContentRevision = {
  id: string;
  contentType: string;
  contentId: string;
  revisionNumber: number;
  state: EditorialState;
  editorSubject: string;
  createdAt: string;
};

const _apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1').replace(
  /\/$/,
  '',
);

export function getApiBase() {
  return _apiBase;
}

export function getToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem('wh_admin_access_token');
}

export async function adminFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getToken();
  if (!token) {
    return { data: null, error: 'AUTH_REQUIRED', status: 401 };
  }
  try {
    const headers = new Headers(options?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetch(`${_apiBase}/admin/${path.replace(/^\//, '')}`, {
      ...options,
      headers,
      cache: 'no-store',
    });
    if (response.status === 401) {
      sessionStorage.removeItem('wh_admin_access_token');
      return { data: null, error: 'AUTH_REQUIRED', status: 401 };
    }
    const body = (await response.json().catch(() => null)) as T | { message?: string } | null;
    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'message' in body && body.message
          ? String(body.message)
          : `HTTP ${response.status}`;
      return { data: null, error: message, status: response.status };
    }
    return { data: body as T, error: null, status: response.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
      status: 0,
    };
  }
}

export const STATE_LABELS: Record<EditorialState, string> = {
  DRAFT: 'Qabyo',
  SUBMITTED: 'La gudbiyay',
  IN_REVIEW: 'Dib-u-eegis',
  CHANGES_REQUESTED: 'Sixid loo baahan yahay',
  APPROVED: 'La ansixiyay',
  PUBLISHED: 'La daabacay',
  REJECTED: 'La diiday',
  ARCHIVED: 'La kaydiyay',
};

export const STATE_COLORS: Record<EditorialState, string> = {
  DRAFT: 'admin-badge-draft',
  SUBMITTED: 'admin-badge-submitted',
  IN_REVIEW: 'admin-badge-review',
  CHANGES_REQUESTED: 'admin-badge-changes',
  APPROVED: 'admin-badge-approved',
  PUBLISHED: 'admin-badge-published',
  REJECTED: 'admin-badge-rejected',
  ARCHIVED: 'admin-badge-archived',
};
