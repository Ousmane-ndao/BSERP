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
import { BriefcaseBusiness, TrendingUp, Users, PhoneCall, MapPinned, CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react';
import { useCommercialActivities, useCommercialDashboardStats } from '@/hooks/useQueries';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DashboardMetricCard, type DashboardMetricSpec } from '@/components/dashboard/DashboardMetricCard';
import { DASH_BLUE, DASH_GREEN, DASH_AMBER, DASH_ORANGE, DASH_PURPLE, DASH_CORAL, DASH_METRIC_STYLES } from '@/lib/dashboardTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { commercialActivitiesApi } from '@/services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ACTIVITY_TYPES = ['Appel', 'Visite', 'Ouverture de dossier', 'Rendez-vous', 'Prospect suivi', 'Client suivi'];

interface CommercialActivityRow {
  id: string | number;
  client_id?: string | number | null;
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
    client_name: '',
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
  const [activityForm, setActivityForm] = useState(emptyActivityForm);
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [activitySaved, setActivitySaved] = useState('');
  const [editingActivity, setEditingActivity] = useState<CommercialActivityRow | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<CommercialActivityRow | null>(null);
  const [activityDeleting, setActivityDeleting] = useState(false);

  const activities = (activitiesRes?.data ?? []) as CommercialActivityRow[];

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

  const resetActivityEditor = () => {
    setEditingActivity(null);
    setActivityForm(emptyActivityForm());
    setActivityError('');
    setActivitySaved('');
  };

  const openActivityForEdit = (activity: CommercialActivityRow) => {
    setEditingActivity(activity);
    setActivityError('');
    setActivitySaved('');
    setActivityForm({
      type: activity.type,
      date: activity.date.slice(0, 10),
      time: activity.time?.slice(0, 5) ?? '',
      client_id: activity.client_id ? String(activity.client_id) : '',
      client_name: activity.client_name ?? activity.prospect_name ?? [activity.client?.prenom, activity.client?.nom].filter(Boolean).join(' '),
      prospect_name: activity.prospect_name ?? '',
      objective: activity.objective ?? '',
      result: activity.result ?? '',
      commentary: activity.commentary ?? '',
    });
  };

  const handleSubmitActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActivitySaving(true);
    setActivityError('');
    setActivitySaved('');
    try {
      const contactName = activityForm.client_name.trim();
      const payload = {
        type: activityForm.type,
        date: activityForm.date,
        time: activityForm.time || null,
        client_id: activityForm.client_id ? Number(activityForm.client_id) : null,
        client_name: contactName,
        prospect_name: activityForm.type === 'Prospect suivi' ? contactName : activityForm.prospect_name.trim() || null,
        objective: activityForm.objective.trim() || null,
        result: activityForm.result.trim() || null,
        commentary: activityForm.commentary.trim() || null,
      };
      const wasEditing = editingActivity !== null;
      if (editingActivity) {
        await commercialActivitiesApi.update(String(editingActivity.id), payload);
      } else {
        await commercialActivitiesApi.create(payload);
      }
      setEditingActivity(null);
      setActivityForm(emptyActivityForm());
      setActivitySaved(wasEditing ? 'Activité modifiée.' : 'Activité enregistrée.');
      void queryClient.invalidateQueries({ queryKey: ['commercial_activities'] });
      void queryClient.invalidateQueries({ queryKey: ['commercial_dashboard_stats'] });
    } catch {
      setActivityError(editingActivity ? 'Impossible de modifier cette activité.' : 'Impossible d’enregistrer cette activité. Vérifiez votre accès et réessayez.');
    } finally {
      setActivitySaving(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!activityToDelete) return;
    setActivityDeleting(true);
    setActivityError('');
    try {
      await commercialActivitiesApi.delete(String(activityToDelete.id));
      setActivityToDelete(null);
      setActivitySaved('Activité supprimée.');
      void queryClient.invalidateQueries({ queryKey: ['commercial_activities'] });
      void queryClient.invalidateQueries({ queryKey: ['commercial_dashboard_stats'] });
    } catch {
      setActivityToDelete(null);
      setActivityError('Impossible de supprimer cette activité. Vérifiez votre accès et réessayez.');
    } finally {
      setActivityDeleting(false);
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
        <form onSubmit={handleSubmitActivity} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            {editingActivity ? <Pencil size={18} className="text-slate-600" aria-hidden /> : <Plus size={18} className="text-slate-600" aria-hidden />}
            <h2 className="text-base font-semibold text-slate-900">{editingActivity ? 'Modifier une activité' : 'Saisir une activité'}</h2>
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="activity-client-name">Client ou prospect</Label>
              <Input
                id="activity-client-name"
                value={activityForm.client_name}
                onChange={(event) => setActivityForm({ ...activityForm, client_name: event.target.value })}
                placeholder="Nom du client ou prospect"
                required
              />
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
          {activitySaved && <p className="mt-3 text-sm text-emerald-700" role="status">{activitySaved}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" disabled={activitySaving}>
              {activitySaving ? 'Enregistrement…' : editingActivity ? 'Enregistrer les modifications' : 'Enregistrer l’activité'}
            </Button>
            {editingActivity && <Button type="button" variant="outline" onClick={resetActivityEditor} disabled={activitySaving}>Annuler</Button>}
          </div>
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
                    <div className="flex items-center gap-1.5">
                      <time className="text-xs text-slate-500" dateTime={`${activity.date.slice(0, 10)}${activity.time ? `T${activity.time}` : ''}`}>
                        {formatActivityDate(activity.date)}{activity.time ? ` à ${activity.time.slice(0, 5)}` : ''}
                      </time>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openActivityForEdit(activity)} aria-label={`Modifier l’activité ${activity.type}`} title="Modifier l’activité">
                        <Pencil size={15} />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setActivityToDelete(activity)} aria-label={`Supprimer l’activité ${activity.type}`} title="Supprimer l’activité">
                        <Trash2 size={15} />
                      </Button>
                    </div>
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

      <AlertDialog
        open={activityToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !activityDeleting) setActivityToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette activité ?</AlertDialogTitle>
            <AlertDialogDescription>Cette suppression est définitive et ne concerne que l’activité sélectionnée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activityDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={activityDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteActivity();
              }}
            >
              {activityDeleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
