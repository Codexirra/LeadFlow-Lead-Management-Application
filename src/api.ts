import type {
  Contact,
  ContactCreatePayload,
  DashboardData,
  FollowUp,
  FollowUpCreatePayload,
  LeadCreatePayload,
  LeadDetail,
  LeadFilters,
  LeadSummary,
  LeadUpdatePayload,
  Note,
  NoteCreatePayload
} from './types';

const rawBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = normalizeApiBaseUrl(rawBaseUrl);

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/api';

  const withoutTrailingSlash = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;

  try {
    const url = new URL(withoutTrailingSlash, window.location.origin);
    const isRelative = !/^https?:\/\//i.test(withoutTrailingSlash);

    if (url.origin === window.location.origin && (url.pathname === '' || url.pathname === '/')) {
      return '/api';
    }

    if (url.pathname !== '/api' && !url.pathname.endsWith('/api')) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}/api`;
    }

    const normalized = url.toString().replace(/\/$/, '');
    return isRelative ? `${url.pathname}${url.search}${url.hash}`.replace(/\/$/, '') || '/api' : normalized;
  } catch {
    const normalized = withoutTrailingSlash || '/api';
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const requestedUrl = `${API_BASE_URL}${path}`;
  const response = await fetch(requestedUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Keep default detail when body is not JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const preview = text.trim().slice(0, 120);
    const looksLikeHtml = preview.toLowerCase().startsWith('<!doctype') || preview.toLowerCase().startsWith('<html');
    throw new Error(
      looksLikeHtml
        ? `API returned the frontend HTML instead of backend JSON for ${requestedUrl}. This means the request is still being handled by the frontend server; confirm the FastAPI backend is running and same-origin /api requests are routed to it.`
        : `API returned a non-JSON response from ${requestedUrl}: ${preview || 'empty response'}`
    );
  }

  return response.json() as Promise<T>;
}

function toQueryString(filters: LeadFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  getDashboard: () => request<DashboardData>('/dashboard'),
  listLeads: (filters: LeadFilters = {}) => request<LeadSummary[]>(`/leads${toQueryString(filters)}`),
  getLead: (id: number) => request<LeadDetail>(`/leads/${id}`),
  createLead: (payload: LeadCreatePayload) =>
    request<LeadDetail>('/leads', { method: 'POST', body: JSON.stringify(payload) }),
  updateLead: (id: number, payload: LeadUpdatePayload) =>
    request<LeadDetail>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addContact: (leadId: number, payload: ContactCreatePayload) =>
    request<Contact>(`/leads/${leadId}/contacts`, { method: 'POST', body: JSON.stringify(payload) }),
  addNote: (leadId: number, payload: NoteCreatePayload) =>
    request<Note>(`/leads/${leadId}/notes`, { method: 'POST', body: JSON.stringify(payload) }),
  addFollowUp: (leadId: number, payload: FollowUpCreatePayload) =>
    request<FollowUp>(`/leads/${leadId}/follow-ups`, { method: 'POST', body: JSON.stringify(payload) }),
  completeFollowUp: (leadId: number, followUpId: number) =>
    request<FollowUp>(`/leads/${leadId}/follow-ups/${followUpId}/complete`, { method: 'PATCH' })
};
