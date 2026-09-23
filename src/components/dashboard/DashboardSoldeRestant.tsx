import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useClientsOptions, useDashboardSoldeRestant } from '@/hooks/useQueries';
import { formatMoneyWithLabel } from '@/lib/currency';
import { DASH_ORANGE } from '@/lib/dashboardTheme';

interface SoldeClientRow {
  clientId: string;
  clientName: string;
  montantTotal: number;
  montantPaye: number;
  soldeRestant: number;
  statut: string;
  dossiersCount: number;
}

interface ClientOption {
  id: string;
  nom: string;
  prenom: string;
}

export function DashboardSoldeRestant() {
  const [period, setPeriod] = useState('all');
  const [clientId, setClientId] = useState('');
  const [statut, setStatut] = useState('');

  const params = useMemo(() => {
    const next: Record<string, string> = { period };
    if (clientId) next.client_id = clientId;
    if (statut) next.statut = statut;
    return next;
  }, [period, clientId, statut]);

  const { data, isLoading } = useDashboardSoldeRestant(params);
  const payload = (data?.data ?? data ?? {}) as {
    solde_restant_total?: number;
    montant_total_du?: number;
    montant_paye?: number;
    dossiers_count?: number;
    clients?: SoldeClientRow[];
  };

  const { data: clientsData } = useClientsOptions();
  const clients = ((clientsData as { data?: ClientOption[] } | undefined)?.data ?? []) as ClientOption[];

  const solde = Number(payload.solde_restant_total ?? 0);
  const rows = payload.clients ?? [];

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Montant restant total</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
            {isLoading ? '…' : formatMoneyWithLabel(solde)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Dû {formatMoneyWithLabel(payload.montant_total_du ?? 0)} · Payé{' '}
            {formatMoneyWithLabel(payload.montant_paye ?? 0)} · {payload.dossiers_count ?? 0} dossier
            {(payload.dossiers_count ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: DASH_ORANGE }}
        >
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Période
          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">Tout</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Client
          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Tous</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prenom} {c.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Statut
          <select
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
          >
            <option value="">Tous</option>
            <option value="impaye">Impayé</option>
            <option value="partiel">Partiel</option>
            <option value="paye">Payé</option>
          </select>
        </label>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3 text-right">Dû</th>
                <th className="py-2 pr-3 text-right">Payé</th>
                <th className="py-2 pr-3 text-right">Solde</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.clientId} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-800">{row.clientName}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoneyWithLabel(row.montantTotal)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoneyWithLabel(row.montantPaye)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {formatMoneyWithLabel(row.soldeRestant)}
                  </td>
                  <td className="py-2 text-slate-600">{row.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
