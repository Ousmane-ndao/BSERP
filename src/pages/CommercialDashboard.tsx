import { useMemo } from 'react';
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
} from 'recharts';
import { BriefcaseBusiness, TrendingUp, Users, PhoneCall, MapPinned, CalendarDays } from 'lucide-react';
import { useCommercialDashboardStats } from '@/hooks/useQueries';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DashboardMetricCard, type DashboardMetricSpec } from '@/components/dashboard/DashboardMetricCard';
import { DASH_BLUE, DASH_GREEN, DASH_AMBER, DASH_ORANGE, DASH_PURPLE, DASH_CORAL, DASH_METRIC_STYLES } from '@/lib/dashboardTheme';

const TYPE_COLORS: Record<string, string> = {
  Appel: DASH_BLUE,
  Visite: DASH_GREEN,
  'Ouverture de dossier': DASH_AMBER,
  'Rendez-vous': DASH_ORANGE,
  'Prospect suivi': DASH_PURPLE,
  'Client suivi': DASH_CORAL,
};

export default function CommercialDashboard() {
  const { data, isPending, error } = useCommercialDashboardStats();

  const rawStats = (data as Record<string, unknown> | undefined) ?? {};
  const stats =
    rawStats && typeof rawStats === 'object' && 'data' in rawStats && rawStats.data && typeof rawStats.data === 'object'
      ? (rawStats.data as Record<string, unknown>)
      : rawStats;

  const metrics = useMemo<DashboardMetricSpec[]>(() => {
    const totalActivities = Number(stats.total_activities ?? 0);
    const totalCommercials = Number(stats.total_commerciaux ?? 0);
    const totalAppels = Number(stats.appels ?? 0);
    const totalVisits = Number(stats.visites ?? 0);
    const totalMeetings = Number(stats.rendez_vous ?? 0);

    return [
      { label: 'Activités', value: String(totalActivities), icon: BriefcaseBusiness, ...DASH_METRIC_STYLES.blue },
      { label: 'Commerciaux', value: String(totalCommercials), icon: Users, ...DASH_METRIC_STYLES.green },
      { label: 'Appels', value: String(totalAppels), icon: PhoneCall, ...DASH_METRIC_STYLES.orange },
      { label: 'Visites', value: String(totalVisits), icon: MapPinned, ...DASH_METRIC_STYLES.amber },
      { label: 'Rendez-vous', value: String(totalMeetings), icon: CalendarDays, ...DASH_METRIC_STYLES.purple },
      { label: 'Tendance', value: totalActivities > 0 ? 'Actif' : 'Vide', icon: TrendingUp, ...DASH_METRIC_STYLES.coral },
    ];
  }, [stats]);

  const pieData = useMemo(
    () =>
      Object.entries(((stats.by_type ?? stats.byType) as Record<string, number | string> | undefined) ?? {})
        .map(([name, value]) => ({ name, value: Number(value) || 0, color: TYPE_COLORS[name] ?? DASH_BLUE }))
        .filter((item) => item.value > 0),
    [stats],
  );

  const commercialData = useMemo(
    () =>
      (((stats.by_commercial ?? stats.byCommercial) as Array<{ name?: string; total?: number }>[]) ?? []).map((row) => ({
        name: row.name ?? 'Commercial',
        total: Number(row.total ?? 0),
      })),
    [stats],
  );

  return (
    <DashboardPageShell
      title="Commercial"
      subtitle="Suivi des activités et performances commerciales"
      stripLabel="Dashboard commercial"
    >
      {error && <p className="text-sm text-destructive">Impossible de charger le tableau de bord commercial.</p>}

      <div className="grid auto-rows-max grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} loading={isPending} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="dashboard-chart-card h-[340px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Répartition par type</h2>
            <span className="text-xs text-slate-500">{Number(stats.total_activities ?? 0)} activités</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} activités`, 'Total']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-chart-card h-[340px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Performance par commercial</h2>
            <span className="text-xs text-slate-500">Activités enregistrées</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={commercialData} margin={{ top: 12, right: 12, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} angle={-12} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => [`${value} activités`, 'Total']} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill={DASH_BLUE} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardPageShell>
  );
}
