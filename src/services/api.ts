import axios, { type AxiosHeaders } from 'axios';
import { LOGIN_ROUTE } from '@/lib/routes';

/** Base URL API : toujours se terminer par `/api` (routes Laravel). */
function resolveApiBaseURL(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const fallbackProd = '/api';

  // Erreur fréquente : VITE_API_URL=http://localhost:8080 → POST :8080/login (404). En dev on passe par le proxy.
  if (import.meta.env.DEV) {
    if (!raw) {
      return '/api';
    }
    try {
      const u = new URL(raw);
      if (u.port === '8080' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
        return '/api';
      }
    } catch {
      /* ignore */
    }
  }

  if (!raw) {
    return fallbackProd;
  }

  const noTrail = raw.replace(/\/+$/, '');
  const normalized = noTrail.endsWith('/api') ? noTrail : `${noTrail}/api`;

  try {
    const apiUrl = new URL(normalized, window.location.origin);
    const isLoopback = ['localhost', '127.0.0.1'].includes(apiUrl.hostname);
    const currentHost = window.location.hostname;
    const currentIsLoopback = ['localhost', '127.0.0.1'].includes(currentHost);
    const mixedContent = window.location.protocol === 'https:' && apiUrl.protocol === 'http:';

    // En prod distante (ou HTTPS), on force le même host pour éviter blocages réseau/CORS/mixed-content.
    if (mixedContent || (isLoopback && !currentIsLoopback)) {
      return '/api';
    }
  } catch {
    // Si l'URL est invalide, on repasse en route relative pour garder l'app fonctionnelle.
    return '/api';
  }

  return normalized;
}

const resolvedApiBaseURL = resolveApiBaseURL();
if (import.meta.env.DEV) {
  // Aide au diagnostic : la vraie connexion doit apparaître vers …/api/login (pas POST sur :8080/login sans /api).
  console.debug('[BSERP] API baseURL =', resolvedApiBaseURL, '| VITE_API_URL =', import.meta.env.VITE_API_URL ?? '(non défini)');
}

const api = axios.create({
  baseURL: resolvedApiBaseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bserp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Axios + FormData: ne pas forcer Content-Type, sinon le navigateur n'ajoute pas le boundary
  // et Laravel ne récupère pas correctement `file`.
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (isFormData) {
    const h = config.headers as AxiosHeaders | undefined;
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type');
    } else if (config.headers && typeof config.headers === 'object') {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
    }
    return config;
  }

  // Pour les payloads JSON, on applique un Content-Type explicite si absent.
  const method = (config.method ?? 'get').toLowerCase();
  const shouldSendBody = ['post', 'put', 'patch', 'delete'].includes(method);
  if (shouldSendBody) {
    const existing =
      (config.headers as Record<string, unknown> | undefined)?.['Content-Type'] ??
      (config.headers as Record<string, unknown> | undefined)?.['content-type'];
    if (!existing) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, unknown>)['Content-Type'] = 'application/json';
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bserp_token');
      localStorage.removeItem('bserp_user');
      window.location.href = LOGIN_ROUTE;
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
export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
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

/** Télécharge un export (CSV, XLSX, PDF) avec le jeton Sanctum. */
export async function downloadExport(path: string, fallbackFilename: string): Promise<void> {
  const res = await api.get(path, { responseType: 'blob' });
  const dispo = res.headers['content-disposition'] as string | undefined;
  let filename = fallbackFilename;
  if (dispo) {
    const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(dispo);
    if (m) filename = decodeURIComponent(m[1].trim());
  }
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
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
