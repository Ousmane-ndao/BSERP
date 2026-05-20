import axios, { type AxiosHeaders } from 'axios';
import { LOGIN_ROUTE } from '@/lib/routes';

/** Base URL API : toujours se terminer par `/api` (routes Laravel). */
function resolveApiBaseURL(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  /** Même origine : en prod sur Vercel, `vercel.json` peut réécrire `/api/*` vers le backend Render. */
  const fallbackSameOrigin = '/api';

  // En dev, toujours le proxy Vite (/api) pour éviter le CORS navigateur.
  if (import.meta.env.DEV) {
    return '/api';
  }

  if (!raw) {
    console.warn(
      '[BSERP] VITE_API_URL absent au build : requêtes vers /api (réécriture Vercel → backend si vercel.json est déployé). Définissez VITE_API_URL=https://…/api pour un autre hébergeur.',
    );
    return fallbackSameOrigin;
  }

  const noTrail = raw.replace(/\/+$/, '');
  const normalized = noTrail.endsWith('/api') ? noTrail : `${noTrail}/api`;

  try {
    const apiUrl = new URL(normalized);
    const mixedContent =
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      apiUrl.protocol === 'http:';

    if (mixedContent) {
      console.error(
        '[BSERP] VITE_API_URL est en http sur un site https (mixed content). Utilisez une URL https pour l’API.',
      );
    }

    // Ne pas remplacer par /api ici : sur Vercel, /api sans rewrite ne pointe pas vers Laravel et casse
    // clients/documents. Si l’API est en localhost dans l’env alors que le site est en prod, l’URL explicite
    // évite un fallback silencieux vers le mauvais hôte.
    return normalized;
  } catch {
    console.error('[BSERP] VITE_API_URL invalide:', raw);
    return fallbackSameOrigin;
  }
}

const resolvedApiBaseURL = resolveApiBaseURL();
if (import.meta.env.DEV) {
  // Aide au diagnostic : la vraie connexion doit apparaître vers …/api/login (pas POST sur :8080/login sans /api).
  console.debug('[BSERP] API baseURL =', resolvedApiBaseURL, '| VITE_API_URL =', import.meta.env.VITE_API_URL ?? '(non défini)');
}

const api = axios.create({
  baseURL: resolvedApiBaseURL,
  headers: { 'Content-Type': 'application/json' },
  // Timeout for API requests (ms) — protège contre hangs si le backend cold-start
  // Augmenté pour tolérer les cold-starts Render (30s)
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bserp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // For multipart uploads, let the browser set Content-Type with boundary.
  if (config.data instanceof FormData) {
    const h = config.headers as AxiosHeaders | undefined;
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type');
    } else if (config.headers && typeof config.headers === 'object') {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    if (status === 401) {
      localStorage.removeItem('bserp_token');
      localStorage.removeItem('bserp_user');
      window.location.href = LOGIN_ROUTE;
      return Promise.reject(error);
    }

    // Log useful info for diagnostics (network, status, url)
    try {
      console.error('[BSERP] API error', { url, status, message: error.message, response: error.response?.data });
    } catch {
      // ignore
    }

    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/login', { email, password }),
  logout: () => api.post('/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) => api.put('/settings/profile', data),
  updatePassword: (data: Record<string, unknown>) => api.put('/settings/password', data),
};

// Dashboard
// Small helper: retry with exponential backoff for recoverable errors
async function retryRequest<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const e = axios.isAxiosError(err) ? err : undefined;
      const status = e?.response?.status;
      const isNetworkError = !e?.response;
      const isTimeout = e?.code === 'ECONNABORTED' || (e?.message && e.message.includes('timeout'));
      const serverError = typeof status === 'number' && status >= 500 && status < 600;

      // Only retry on network errors, timeouts or 5xx server errors
      if (i === retries || !(isNetworkError || isTimeout || serverError)) {
        throw err;
      }

      const delay = baseDelay * Math.pow(2, i);
      try {
        await new Promise((res) => setTimeout(res, delay));
      } catch {
        // ignore
      }
    }
  }
  throw lastErr;
}

export const dashboardApi = {
  getStats: () => retryRequest(() => api.get('/dashboard'), 3, 1200),
};

// Clients
export const clientsApi = {
  getAll: (params?: Record<string, string>) => api.get('/clients', { params }),
  getOptions: (params?: Record<string, string>) => api.get('/clients/options', { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: Record<string, unknown>) => api.post('/clients', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

export const destinationsApi = {
  getAll: () => api.get('/destinations'),
};

/** Comptes étudiants (email / Campus France / Parcoursup) — champs sensibles chiffrés côté API (cast encrypted Laravel) */
export const studentAccountsApi = {
  get: (clientId: string) => api.get(`/student-accounts/${clientId}`),
  create: (data: Record<string, unknown>) => api.post('/student-accounts', data),
  update: async (clientId: string, data: Record<string, unknown>) => {
    try {
      return await api.patch(`/student-accounts/${clientId}`, data);
    } catch (error) {
      const e = error as { response?: unknown };
      if (!e.response) {
        return api.put(`/student-accounts/${clientId}`, data);
      }
      throw error;
    }
  },
};

/** Suivi du dossier (cases à cocher) */
export const studentProgressApi = {
  get: (clientId: string) => api.get(`/student-progress/${clientId}`),
  create: (data: Record<string, unknown>) => api.post('/student-progress', data),
  update: async (clientId: string, data: Record<string, unknown>) => {
    try {
      return await api.patch(`/student-progress/${clientId}`, data);
    } catch (error) {
      const e = error as { response?: unknown };
      if (!e.response) {
        return api.put(`/student-progress/${clientId}`, data);
      }
      throw error;
    }
  },
};

// Dossiers
export const dossiersApi = {
  getAll: (params?: Record<string, string>) => api.get('/dossiers', { params }),
  getAllCursor: (params?: Record<string, string>) =>
    api.get('/dossiers', { params: { ...(params ?? {}), cursor_mode: '1' } }),
  /** Liste légère (max 50) pour listes déroulantes — mêmes filtres search/statut/destination que la liste. */
  getOptions: (params?: Record<string, string>) => api.get('/dossiers/options', { params }),
  getById: (id: string) => api.get(`/dossiers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/dossiers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/dossiers/${id}`, data),
  delete: (id: string) => api.delete(`/dossiers/${id}`),
};

export const dossierExportsApi = {
  enqueue: (format: 'csv' | 'xlsx' | 'pdf', filters?: Record<string, string>) =>
    api.post('/exports/dossiers', { format, ...(filters ?? {}) }),
  status: (id: string) => api.get(`/exports/dossiers/${id}`),
  download: (id: string) => api.get(`/exports/dossiers/${id}/download`, { responseType: 'blob' }),
};

// Documents
export const documentsApi = {
  getAll: (params?: Record<string, string>) => api.get('/documents', { params }),
  getById: (id: string) => api.get(`/documents/${id}`),
  upload: (dossierId: string, file: File, typeDocument?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dossier_id', String(dossierId));
    if (typeDocument) {
      formData.append('type_document', typeDocument);
    }
    return api.post('/documents', formData);
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
};

// Payments
export const paymentsApi = {
  getAll: (params?: Record<string, string>) => api.get('/payments', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/payments', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/payments/${id}`, data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

export const accountingApi = {
  summary: () => api.get('/accounting/summary'),
};

export const expensesApi = {
  getAll: (params?: Record<string, string>) => api.get('/expenses', { params }),
  getById: (id: string) => api.get(`/expenses/${id}`),
  create: (data: Record<string, unknown>) => api.post('/expenses', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const invoicesApi = {
  getAll: (params?: Record<string, string>) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  create: (data: Record<string, unknown>) => api.post('/invoices', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  downloadPdf: (id: string) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  getShareLinks: (id: string) => api.get(`/invoices/${id}/share-links`),
  sendEmail: (id: string) => api.post(`/invoices/${id}/send-email`),
};

function filenameFromDisposition(dispo: string | undefined, fallback: string): string {
  if (!dispo) return fallback;
  const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(dispo);
  return m ? decodeURIComponent(m[1].trim()) : fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/** Détecte une réponse JSON d’erreur renvoyée avec responseType blob (ex. 404 fichier manquant). */
async function assertBlobIsNotJsonError(blob: Blob): Promise<Blob> {
  if (blob.size === 0) {
    throw new Error('Réponse vide du serveur.');
  }
  const sample = await blob.slice(0, Math.min(blob.size, 2048)).text();
  const trimmed = sample.trimStart();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return blob;
  }
  try {
    const json = JSON.parse(await blob.text()) as { message?: string };
    throw new Error(json.message || 'Téléchargement impossible.');
  } catch (e) {
    if (e instanceof Error && !(e instanceof SyntaxError)) {
      throw e;
    }
  }
  return blob;
}

async function downloadBlobResponse(
  res: { data: Blob; headers: Record<string, unknown> },
  fallbackFilename: string,
): Promise<void> {
  const blob = await assertBlobIsNotJsonError(res.data);
  const filename = filenameFromDisposition(
    res.headers['content-disposition'] as string | undefined,
    fallbackFilename,
  );
  triggerBrowserDownload(blob, filename);
}

/** Télécharge un document (gère les erreurs API en JSON). */
export async function downloadDocumentFile(id: string, fallbackFilename: string): Promise<void> {
  try {
    const res = await documentsApi.download(id);
    await downloadBlobResponse(res, fallbackFilename);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      await assertBlobIsNotJsonError(err.response.data);
    }
    throw err;
  }
}

/** Télécharge un export (CSV, XLSX, PDF) avec le jeton Sanctum. */
export async function downloadExport(path: string, fallbackFilename: string): Promise<void> {
  const res = await api.get(path, { responseType: 'blob' });
  await downloadBlobResponse(res, fallbackFilename);
}

/** Export liste dossiers (mêmes filtres que GET /dossiers ; pas de pagination côté export). */
export async function downloadDossiersExport(
  format: 'csv' | 'xlsx' | 'pdf',
  filters: Record<string, string | undefined>,
): Promise<void> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && String(v).trim() !== '') params.set(k, String(v).trim());
  }
  const q = params.toString();
  const path = `/exports/dossiers.${format}${q ? `?${q}` : ''}`;
  await downloadExport(path, `dossiers.${format}`);
}

// Employees
export const employeesApi = {
  getAll: (params?: Record<string, string>) => api.get('/employees', { params }),
  create: (data: Record<string, unknown>) => api.post('/employees', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

export const settingsApi = {
  getCompany: () => api.get('/settings/company'),
  updateCompany: (data: Record<string, unknown>) => api.put('/settings/company', data),
};

export default api;
