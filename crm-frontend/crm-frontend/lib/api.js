import { useSyncExternalStore } from 'react';

// Backend API base URL. Can be configured via NEXT_PUBLIC_API_URL in .env.local
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Status values supported across CRM backend: 'new', 'contacted', 'interested', 'won', 'lost'
export const STATUSES = ['new', 'contacted', 'interested', 'won', 'lost'];

export const STATUS_STYLE = {
  new: 'bg-sky-50 text-sky-700 ring-sky-200',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-200',
  interested: 'bg-violet-50 text-violet-700 ring-violet-200',
  won: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  converted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  lost: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const STATUS_HEX = {
  new: '#0284c7',
  contacted: '#d97706',
  interested: '#7c3aed',
  won: '#059669',
  converted: '#059669',
  lost: '#e11d48',
};

export const EP = {
  leads: '/leads',
  sellers: '/users',
  leadDetails: (id) => `/leads/${id}`,
  leadStatus: (id) => `/leads/${id}/status`,
  leadAssign: (id) => `/leads/${id}/assign`,
  leadNotes: (id) => `/leads/${id}/notes`,
  leadDelete: (id) => `/leads/${id}`,
  bulkImport: '/leads/bulk',
  autoAssign: '/leads/auto-assign',
  sellerBlock: (id) => `/users/${id}`,
};

export const asList = (res, ...keys) => {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(res[k])) return res[k];
  }
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.leads)) return res.leads;
  if (Array.isArray(res.sellers)) return res.sellers;
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.data)) return res.data;
  return [];
};

export const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

export const getUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function subscribe(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  return typeof window !== 'undefined' ? localStorage.getItem('user') : null;
}

function getServerSnapshot() {
  return null;
}

export function useAuthUser() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login';
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') {
    logout();
  }
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}
