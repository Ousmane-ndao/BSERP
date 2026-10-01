import { FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { BriefcaseBusiness, TrendingUp, Users, PhoneCall, MapPinned, CalendarDays, Plus } from 'lucide-react';
import { useClientsOptions, useCommercialActivities, useCommercialDashboardStats } from '@/hooks/useQueries';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DashboardMetricCard, type DashboardMetricSpec } from '@/components/dashboard/DashboardMetricCard';
import { DASH_BLUE, DASH_GREEN, DASH_AMBER, DASH_ORANGE, DASH_PURPLE, DASH_CORAL, DASH_METRIC_STYLES } from '@/lib/dashboardTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { commercialActivitiesApi } from '@/services/api';

const ACTIVITY_TYPES = ['Appel', 'Visite', 'Ouverture de dossier', 'Rendez-vous', 'Prospect suivi', 'Client suivi'];

interface CommercialActivityRow {
  id: string | number;
  type: string;
  date: string;
  time?: string | null;
  client_name?: string | null;
  prospect_name?: string | null;
  objective?: string | null;
  result?: string | null;
  commentary?: string | null;
  commercial_name?: string | null;
  client?: { prenom?: string | null; nom?: string | null } | null;
}

function localDateValue(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function emptyActivityForm() {
  return {
    type: 'Appel',
    date: localDateValue(),
    time: '',
    client_id: '',
    prospect_name: '',
    objective: '',
    result: '',
    commentary: '',
  };
}

const TYPE_COLORS: Record<string, string> = {
  Appel: DASH_BLUE,
  Visite: DASH_GREEN,
  'Ouverture de dossier': DASH_AMBER,
  'Rendez-vous': DASH_ORANGE,
  'Prospect suivi': DASH_PURPLE,
  'Client suivi': DASH_CORAL,
};

export default function CommercialDashboard() {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useCommercialDashboardStats();
  const { data: activitiesRes, isPending: activitiesPending, isError: activitiesFailed } = useCommercialActivities({ per_page: '20' });
  const { data: clientsRes } = useClientsOptions();
  const [activityForm, setActivityForm] = useState(emptyActivityForm);
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activitySaved, setActivitySaved] = useState(false);

  const activities = (activitiesRes?.data ?? []) as CommercialActivityRow[];
  const clients = (clientsRes?.data ?? []) as Array<{ id: string; nom: string; prenom: string }>;

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

  const handleCreateActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActivitySaving(true);
    setActivityError('');
    setActivitySaved(false);
    try {
      await commercialActivitiesApi.create({
        type: activityForm.type,
        date: activityForm.date,
        time: activityForm.time || null,
        client_id: activityForm.client_id ? Number(activityForm.client_id) : null,
        prospect_name: activityForm.prospect_name.trim() || null,
        objective: activityForm.objective.trim() || null,
        result: activityForm.result.trim() || null,
        commentary: activityForm.commentary.trim() || null,
      });
      setActivityForm(emptyActivityForm());
      setActivitySaved(true);
      void queryClient.invalidateQueries({ queryKey: ['commercial_activities'] });
      void queryClient.invalidateQueries({ queryKey: ['commercial_dashboard_stats'] });
    } catch {
      setActivityError('Impossible d’enregistrer cette activité. Vérifiez votre accès et réessayez.');
    } finally {
      setActivitySaving(false);
    }
  };

  const formatActivityDate = (value: string) => {
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
  };

  return (
    <DashboardPageShell
      title="Commercial"
      subtitle="Suivi des activités et performances commerciales"
      stripLabel="Dashboard commercial"
    >
      {error && <p className="text-sm text-destructive">Impossible de charger le tableau de bord commercial.</p>}

      <section className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" aria-label="Saisie et suivi des activités commerciales">
        <form onSubmit={handleCreateActivity} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={18} className="text-slate-600" aria-hidden />
            <h2 className="text-base font-semibold text-slate-900">Saisir une activité</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="activity-type">Type</Label>
              <select id="activity-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={activityForm.type} onChange={(event) => setActivityForm({ ...activityForm, type: event.target.value })}>
                {ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-date">Date</Label>
              <Input id="activity-date" type="date" value={activityForm.date} onChange={(event) => setActivityForm({ ...activityForm, date: event.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-time">Heure</Label>
              <Input id="activity-time" type="time" value={activityForm.time} onChange={(event) => setActivityForm({ ...activityForm, time: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-client">Client</Label>
              <select id="activity-client" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={activityForm.client_id} onChange={(event) => setActivityForm({ ...activityForm, client_id: event.target.value })}>
                <option value="">Aucun client sélectionné</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.prenom} {client.nom}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="activity-prospect">Prospect</Label>
              <Input id="activity-prospect" value={activityForm.prospect_name} onChange={(event) => setActivityForm({ ...activityForm, prospect_name: event.target.value })} placeholder="Nom du prospect, si applicable" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-objective">Objectif</Label>
              <Input id="activity-objective" value={activityForm.objective} onChange={(event) => setActivityForm({ ...activityForm, objective: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-result">Résultat</Label>
              <Input id="activity-result" value={activityForm.result} onChange={(event) => setActivityForm({ ...activityForm, result: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="activity-commentary">Commentaire</Label>
              <textarea id="activity-commentary" className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={activityForm.commentary} onChange={(event) => setActivityForm({ ...activityForm, commentary: event.target.value })} />
            </div>
          </div>
          {activityError && <p className="mt-3 text-sm text-destructive" role="alert">{activityError}</p>}
          {activitySaved && <p className="mt-3 text-sm text-emerald-700" role="status">Activité enregistrée.</p>}
          <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={activitySaving}>
            {activitySaving ? 'Enregistrement…' : 'Enregistrer l’activité'}
          </Button>
        </form>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Activités récentes</h2>
            <span className="text-xs text-slate-500">20 dernières</span>
          </div>
          {activitiesPending && <p className="text-sm text-slate-500">Chargement des activités…</p>}
          {activitiesFailed && <p className="text-sm text-destructive">Impossible de charger les activités.</p>}
          {!activitiesPending && !activitiesFailed && activities.length === 0 && <p className="text-sm text-slate-500">Aucune activité enregistrée.</p>}
          <ul className="divide-y divide-slate-100">
            {activities.map((activity) => {
              const clientName = [activity.client?.prenom, activity.client?.nom].filter(Boolean).join(' ');
              const contact = activity.client_name || activity.prospect_name || clientName;
              return (
                <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-slate-900">{activity.type}{contact ? ` · ${contact}` : ''}</p>
                    <time className="text-xs text-slate-500" dateTime={`${activity.date.slice(0, 10)}${activity.time ? `T${activity.time}` : ''}`}>
                      {formatActivityDate(activity.date)}{activity.time ? ` à ${activity.time.slice(0, 5)}` : ''}
                    </time>
                  </div>
                  {activity.objective && <p className="mt-1 text-xs text-slate-600">Objectif : {activity.objective}</p>}
                  {activity.result && <p className="mt-1 text-xs text-slate-600">Résultat : {activity.result}</p>}
                  {activity.commentary && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{activity.commentary}</p>}
                  {activity.commercial_name && <p className="mt-1 text-[11px] text-slate-400">{activity.commercial_name}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

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
