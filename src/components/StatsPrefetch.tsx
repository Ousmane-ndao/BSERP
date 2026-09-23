import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { accountingApi, dashboardApi } from '@/services/api';

/** Précharge les stats dès qu’un utilisateur est connecté, avant l’ouverture du tableau de bord. */
export function StatsPrefetch() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    void queryClient.prefetchQuery({
      queryKey: ['dashboard_stats'],
      queryFn: async () => {
        const res = await dashboardApi.getStats();
        return res.data;
      },
      staleTime: 5 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: ['accounting_summary'],
      queryFn: async () => {
        const res = await accountingApi.summary();
        return res.data;
      },
      staleTime: 5 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: ['dashboard_solde_restant', { period: 'all' }],
      queryFn: async () => {
        const res = await dashboardApi.getSoldeRestant({ period: 'all' });
        return res.data;
      },
      staleTime: 60_000,
    });
  }, [isAuthenticated, queryClient]);

  return null;
}
