import { useQuery } from '@tanstack/react-query';
import {
  dashboardApi,
  clientsApi,
  destinationsApi,
  dossiersApi,
  documentsApi,
  accountingApi,
  paymentsApi,
  dossierPaymentsApi,
  expensesApi,
  invoicesApi,
  employeesApi,
  myDossierApi,
  settingsApi,
  studentAccountsApi,
  studentProgressApi,
} from '@/services/api';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const res = await dashboardApi.getStats();
      return res.data;
    },
    // Réessayer légèrement en cas d'échec réseau/500 (2 tentatives), et ne pas refetch on focus
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    retryOnMount: true,
    refetchOnReconnect: true,
  });
};

export const useClients = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const res = await clientsApi.getAll(params);
      return res.data;
    },
  });
};

export const useClientsOptions = () => {
  return useQuery({
    queryKey: ['clients_options'],
    queryFn: async () => {
      const res = await clientsApi.getOptions({ limit: '500' });
      return res.data;
    },
  });
};

export const useDestinations = () => {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const res = await destinationsApi.getAll();
      return res.data;
    },
  });
};

export const useDossiers = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['dossiers', params],
    queryFn: async () => {
      const res = await dossiersApi.getAll(params);
      return res.data;
    },
    keepPreviousData: true,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useDossiersOptions = () => {
  return useQuery({
    queryKey: ['dossiers_options'],
    queryFn: async () => {
      const res = await dossiersApi.getOptions();
      return res.data;
    },
  });
};

export const useAccountingSummary = () => {
  return useQuery({
    queryKey: ['accounting_summary'],
    queryFn: async () => {
      const res = await accountingApi.summary();
      return res.data;
    },
  });
};

export const useEmployees = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: async () => {
      const res = await employeesApi.getAll(params);
      return res.data;
    },
  });
};

export const useDocuments = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: async () => {
      const res = await documentsApi.getAll(params);
      return res.data;
    },
    enabled: params !== undefined,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    retryOnMount: true,
    refetchOnReconnect: true,
  });
};

export const useDocumentsClientsSummary = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['documents_clients_summary', params],
    queryFn: async () => {
      const res = await documentsApi.getClientsSummary(params);
      return res.data;
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
};

export const useMyDossier = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['my_dossier', params],
    queryFn: async () => {
      const res = await myDossierApi.get(params);
      return res.data;
    },
    retry: 1,
  });
};

export const usePayments = (params?: Record<string, string>, enabled = true) => {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const res = await paymentsApi.getAll(params);
      return res.data;
    },
    enabled,
  });
};

export const useDossierPayments = (
  clientId: string,
  dossierId: string,
  params?: Record<string, string>,
) => {
  return useQuery({
    queryKey: ['dossier_payments', clientId, dossierId, params],
    queryFn: async () => {
      const res = await dossierPaymentsApi.getAll(clientId, dossierId, params);
      return res.data;
    },
    enabled: !!clientId && !!dossierId,
  });
};

export const useDossierPaymentSummary = (clientId: string, dossierId: string) => {
  return useQuery({
    queryKey: ['dossier_payment_summary', clientId, dossierId],
    queryFn: async () => {
      const res = await dossierPaymentsApi.getSummary(clientId, dossierId);
      return res.data;
    },
    enabled: !!clientId && !!dossierId,
  });
};

export const useExpenses = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const res = await expensesApi.getAll(params);
      return res.data;
    },
  });
};

export const useInvoices = (params?: Record<string, string>) => {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const res = await invoicesApi.getAll(params);
      return res.data;
    },
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const res = await clientsApi.getById(id);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useStudentAccount = (clientId: string) => {
  return useQuery({
    queryKey: ['student_account', clientId],
    queryFn: async () => {
      const res = await studentAccountsApi.get(clientId);
      return res.data;
    },
    enabled: !!clientId,
  });
};

export const useStudentProgress = (clientId: string) => {
  return useQuery({
    queryKey: ['student_progress', clientId],
    queryFn: async () => {
      const res = await studentProgressApi.get(clientId);
      return res.data;
    },
    enabled: !!clientId,
  });
};

export const useCompanySettings = () => {
  return useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const res = await settingsApi.getCompany();
      return res.data;
    },
  });
};
