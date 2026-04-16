import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  FolderOpen,
  CreditCard,
  Receipt,
  FileWarning,
  CalendarDays,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { dashboardApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardMetricCard, type DashboardMetricSpec } from '@/components/dashboard/DashboardMetricCard';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import {
  DASH_GREEN,
  DASH_CORAL,
  DASH_BLUE,
  DASH_AMBER,
  DASH_ORANGE,
  DASH_PURPLE,
  DASH_METRIC_STYLES,
} from '@/lib/dashboardTheme';
import { APP_CURRENCY_LABEL, formatMoneyWithLabel } from '@/lib/currency';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_CHART_COLORS: Record<string, string> = {
  Terminé: DASH_GREEN,
  Complet: DASH_BLUE,
  'En cours': DASH_ORANGE,
  'En attente': DASH_AMBER,
  Rejeté: DASH_CORAL,
  Accepté: DASH_GREEN,
  Refusé: '#ef4444',
  'Visa obtenu': '#0d9488',
  'Visa refusé': '#d946ef',
  'En attente visa': '#f59e0b',
};

interface DashboardStats {
  total_clients?: number;
  total_dossiers?: number;
  dossiers_en_cours?: number;
  dossiers_complets?: number;
  dossiers_termines?: number;
  dossiers_incomplets?: number;
  dossiers_acceptes?: number;
  dossiers_refuses?: number;
  dossiers_en_attente_decision?: number;
  visas_obtenus?: number;
  visas_refuses?: number;
  dossiers_aujourdhui?: number;
  dossiers_ce_mois?: number;
  documents_manquants?: number;
  paiements_recents?: number;
  total_revenus?: number;
  paiements_en_attente?: number;
  pending_invoices?: number;
  dossiers_par_statut?: Record<string, number>;
  dossiers_trend_mois?: Array<{ key: string; label: string; total: number }>;
  revenus_trend_mois?: Array<{ key: string; label: string; total: number }>;
  dossiers_par_destination?: Array<{ name: string; value: number }>;
}

const ROLES_PAYMENTS_API = ['directrice', 'responsable_admin', 'comptable', 'informaticien'] as const;

export default function Dashboard() {
  const { hasAccess } = useAuth();
  const canLoadPayments = hasAccess([...ROLES_PAYMENTS_API]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const dashRes = await dashboardApi.getStats();

        setStats((dashRes.data ?? {}) as DashboardStats);
      } catch {
        setError('Impossible de charger les données du dashboard.');
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données du dashboard.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const metrics = useMemo(() => {
    if (!stats) return [];
    const totalClients = Number(stats.total_clients ?? 0);
    const totalDossiers = Number(stats.total_dossiers ?? 0);
    const enCours = Number(stats.dossiers_en_cours ?? 0);
    const complets = Number(stats.dossiers_complets ?? 0);
    const termines = Number(stats.dossiers_termines ?? 0);
    const incomplets = Number(stats.dossiers_incomplets ?? 0);
    const acceptes = Number(stats.dossiers_acceptes ?? 0);
    const refuses = Number(stats.dossiers_refuses ?? 0);
    const enAttenteDecision = Number(stats.dossiers_en_attente_decision ?? 0);
    const visasObtenus = Number(stats.visas_obtenus ?? 0);
    const visasRefuses = Number(stats.visas_refuses ?? 0);
    const today = Number(stats.dossiers_aujourdhui ?? 0);
    const month = Number(stats.dossiers_ce_mois ?? 0);
    const missingDocs = Number(stats.documents_manquants ?? 0);
    const pendingPay = Number(stats.paiements_en_attente ?? 0);

    const totalRevenue = Number(stats.total_revenus ?? 0);
    const paiementsRecents = Number(stats.paiements_recents ?? 0);

    const list: DashboardMetricSpec[] = [
      { label: 'Clients', value: String(totalClients), icon: Users, ...DASH_METRIC_STYLES.green },
      { label: 'Total dossiers', value: String(totalDossiers), icon: FolderOpen, ...DASH_METRIC_STYLES.coral },
      { label: 'Dossiers en cours', value: String(enCours), icon: Clock, ...DASH_METRIC_STYLES.amber },
      { label: 'Dossiers complets', value: String(complets), icon: CheckCircle, ...DASH_METRIC_STYLES.blue },
      { label: 'Dossiers terminés', value: String(termines), icon: CheckCircle, ...DASH_METRIC_STYLES.green },
      { label: 'Dossiers incomplets', value: String(incomplets), icon: FileWarning, ...DASH_METRIC_STYLES.orange },
      { label: 'Acceptés', value: String(acceptes), icon: CheckCircle, ...DASH_METRIC_STYLES.green },
      { label: 'Refusés', value: String(refuses), icon: FileWarning, ...DASH_METRIC_STYLES.coral },
      { label: 'En attente décision', value: String(enAttenteDecision), icon: Clock, ...DASH_METRIC_STYLES.amber },
      { label: 'Visas obtenus', value: String(visasObtenus), icon: CheckCircle, ...DASH_METRIC_STYLES.blue },
      { label: 'Visas refusés', value: String(visasRefuses), icon: FileWarning, ...DASH_METRIC_STYLES.purple },
      { label: "Dossiers aujourd'hui", value: String(today), icon: CalendarDays, ...DASH_METRIC_STYLES.purple },
      { label: 'Dossiers ce mois', value: String(month), icon: CalendarDays, ...DASH_METRIC_STYLES.blue },
      { label: 'Sans document', value: String(missingDocs), icon: FileWarning, ...DASH_METRIC_STYLES.coral },
    ];

    if (canLoadPayments) {
      list.push(
        {
          label: 'Chiffre d’affaires',
          value: formatMoneyWithLabel(totalRevenue),
          icon: DollarSign,
          ...DASH_METRIC_STYLES.orange,
        },
        {
          label: 'Paiements (30 j.)',
          value: String(paiementsRecents),
          icon: CreditCard,
          ...DASH_METRIC_STYLES.purple,
        },
        {
          label: 'Paiements / factures en attente',
          value: String(pendingPay),
          icon: CreditCard,
          ...DASH_METRIC_STYLES.amber,
        },
      );
    }

    if (hasAccess(['directrice', 'responsable_admin', 'comptable', 'informaticien'])) {
      list.push({
        label: 'Factures envoyées (non payées)',
        value: String(Number(stats.pending_invoices ?? 0)),
        icon: Receipt,
        ...DASH_METRIC_STYLES.amber,
      });
    }

    return list;
  }, [stats, hasAccess, canLoadPayments]);

  const pieByStatus = useMemo(() => {
    const map = stats?.dossiers_par_statut ?? {};
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value: Number(value),
        color: STATUS_CHART_COLORS[name] ?? DASH_PURPLE,
      }))
      .filter((row) => row.value > 0);
  }, [stats?.dossiers_par_statut]);

  const totalRevenue = Number(stats?.total_revenus ?? 0);

  const mergedMonthly = useMemo(() => {
    const trend = stats?.dossiers_trend_mois ?? [];
    const revenueByMonth = new Map(
      (stats?.revenus_trend_mois ?? []).map((r) => [r.key, Number(r.total)]),
    );
    return trend.map((m) => ({
      mois: m.label,
      dossiers: m.total,
      revenus: canLoadPayments ? (revenueByMonth.get(m.key) ?? 0) : 0,
    }));
  }, [stats?.dossiers_trend_mois, stats?.revenus_trend_mois, canLoadPayments]);

  const dossiersByDestination = stats?.dossiers_par_destination ?? [];

  const destColors = [DASH_GREEN, DASH_BLUE, DASH_ORANGE, DASH_PURPLE, DASH_AMBER, DASH_CORAL];

  return (
    <DashboardPageShell
      title="Tableau de bord"
      subtitle="Vue synthétique de l’activité"
      stripLabel="Indicateurs et graphiques"
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des statistiques...
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((m) => (
          <DashboardMetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="dashboard-chart-card">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Répartition par statut</h2>
          <ul className="space-y-3 text-sm">
            {Object.entries(stats?.dossiers_par_statut ?? {}).map(([key, n]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0"
              >
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_CHART_COLORS[key] ?? DASH_PURPLE }}
                  />
                  {key}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{Number(n)}</span>
              </li>
            ))}
            {Object.keys(stats?.dossiers_par_statut ?? {}).length === 0 && (
              <li className="text-slate-500">Aucune donnée</li>
            )}
          </ul>
        </div>

        <div className="dashboard-chart-card">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Synthèse dossiers</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
              <span className="font-medium" style={{ color: DASH_CORAL }}>
                Total dossiers
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{stats?.total_dossiers ?? 0}</span>
            </li>
            <li className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
              <span className="font-medium" style={{ color: DASH_BLUE }}>
                Dossiers ce mois
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{stats?.dossiers_ce_mois ?? 0}</span>
            </li>
            <li className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
              <span className="font-medium" style={{ color: DASH_AMBER }}>
                Documents manquants (0 fichier)
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{stats?.documents_manquants ?? 0}</span>
            </li>
            {canLoadPayments && (
              <>
                <li className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="font-medium" style={{ color: DASH_GREEN }}>
                    Revenus enregistrés
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatMoneyWithLabel(totalRevenue)}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="font-medium" style={{ color: DASH_ORANGE }}>
                    Paiements / factures en attente
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {stats?.paiements_en_attente ?? 0}
                  </span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="dashboard-chart-card">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Dossiers par statut</h2>
          <p className="mb-4 text-xs text-slate-500">Répartition des dossiers selon leur état</p>
          {pieByStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  dataKey="value"
                  paddingAngle={2}
                  nameKey="name"
                >
                  {pieByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Dossiers']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-chart-card">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">
            {canLoadPayments ? 'Dossiers et revenus par mois' : 'Dossiers ouverts par mois'}
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            {canLoadPayments
              ? 'Barres vertes : revenus · Barres corail : dossiers ouverts'
              : 'Nombre de dossiers par mois (6 derniers mois)'}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mergedMonthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748b' }} />
              {canLoadPayments ? (
                <>
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'revenus'
                        ? [`${value.toLocaleString('fr-FR')} ${APP_CURRENCY_LABEL}`, 'Revenus']
                        : [value, 'Dossiers']
                    }
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="revenus"
                    fill={DASH_GREEN}
                    name="revenus"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="dossiers"
                    fill={DASH_CORAL}
                    name="dossiers"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </>
              ) : (
                <>
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Dossiers']} />
                  <Bar dataKey="dossiers" fill={DASH_CORAL} name="dossiers" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {dossiersByDestination.length > 0 && (
        <div className="dashboard-chart-card">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Dossiers par destination</h2>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {dossiersByDestination.map((d, i) => (
              <div
                key={d.name}
                className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 text-xs text-slate-600 sm:max-w-[16rem]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: destColors[i % destColors.length] }}
                />
                <span className="min-w-0 truncate" title={`${d.name} (${d.value})`}>
                  {d.name} ({d.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}
