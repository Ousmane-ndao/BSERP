import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Plus, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { ROLE_LABELS, type Role } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { employeesApi } from '@/services/api';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { formatPersonnelName } from '@/lib/personnelDisplay';
import { LIST_PAGE_SIZE } from '@/constants/ui';

interface Employe {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  role: Role;
  statut: 'Actif' | 'Inactif';
}

/** Bandeau + avatar : aligné sur la palette des cartes métriques */
const ROLE_CARD_THEME: Record<
  Role,
  { header: string; avatarBg: string; avatarText: string; ring: string }
> = {
  directrice: {
    header: 'bg-indigo-600',
    avatarBg: 'bg-indigo-100',
    avatarText: 'text-indigo-800',
    ring: 'ring-indigo-200',
  },
  responsable_admin: {
    header: 'bg-blue-600',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-900',
    ring: 'ring-blue-200',
  },
  conseillere_pedagogique: {
    header: 'bg-emerald-600',
    avatarBg: 'bg-emerald-100',
    avatarText: 'text-emerald-900',
    ring: 'ring-emerald-200',
  },
  informaticien: {
    header: 'bg-amber-500',
    avatarBg: 'bg-amber-100',
    avatarText: 'text-amber-950',
    ring: 'ring-amber-200',
  },
  comptable: {
    header: 'bg-[#e46a4d]',
    avatarBg: 'bg-orange-100',
    avatarText: 'text-orange-950',
    ring: 'ring-orange-200',
  },
  commercial: {
    header: 'bg-[#f87171]',
    avatarBg: 'bg-red-100',
    avatarText: 'text-red-950',
    ring: 'ring-red-200',
  },
  accueil: {
    header: 'bg-slate-600',
    avatarBg: 'bg-slate-100',
    avatarText: 'text-slate-800',
    ring: 'ring-slate-200',
  },
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function EmployeCard({ e }: { e: Employe }) {
  const theme = ROLE_CARD_THEME[e.role] ?? ROLE_CARD_THEME.accueil;
  const displayName = formatPersonnelName(e.nom);
  const initials = initialsFromName(displayName);

  return (
    <article className="group overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className={`${theme.header} flex items-center justify-between gap-2 px-3 py-1.5`}>
        <div className="flex min-w-0 items-center gap-1.5">
          <Briefcase className="h-3 w-3 shrink-0 text-white/80" aria-hidden />
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-white">
            {ROLE_LABELS[e.role]}
          </span>
        </div>
      </div>

      <div className="p-3.5">
        <div className="flex gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ring-2 ring-offset-1 ring-offset-white ${theme.avatarBg} ${theme.avatarText} ${theme.ring}`}
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-sm font-semibold leading-snug tracking-tight text-slate-900">{displayName}</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Équipe</p>
          </div>
        </div>

        <div className="mt-3 space-y-2 rounded-md border border-slate-100 bg-slate-50/90 p-2.5 text-xs">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white shadow-sm">
              <Mail className="h-3 w-3 text-slate-500" aria-hidden />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Email</p>
              <p className="break-all font-medium leading-snug text-slate-800">{e.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white shadow-sm">
              <Phone className="h-3 w-3 text-slate-500" aria-hidden />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Téléphone</p>
              <p className="font-medium leading-snug text-slate-800">
                {e.telephone?.trim() ? e.telephone : <span className="text-slate-400 italic">Non renseigné</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2">
          {e.statut === 'Actif' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Actif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              Inactif
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Personnel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    telephone: '',
    role: 'accueil' as Role,
    password: '',
    password_confirmation: '',
  });

  const sortedEmployes = useMemo(() => {
    return [...employes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
  }, [employes]);

  const totalPages = Math.max(1, Math.ceil(sortedEmployes.length / LIST_PAGE_SIZE));
  const paginatedEmployes = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * LIST_PAGE_SIZE;
    return sortedEmployes.slice(start, start + LIST_PAGE_SIZE);
  }, [sortedEmployes, page, totalPages]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(sortedEmployes.length / LIST_PAGE_SIZE));
    setPage((p) => Math.min(p, tp));
  }, [sortedEmployes.length]);

  const loadEmployees = async () => {
    setError('');
    try {
      const response = await employeesApi.getAll({ per_page: '200' });
      setEmployes((response.data?.data ?? []) as Employe[]);
    } catch {
      setError('Impossible de charger les employés.');
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await employeesApi.create(form);
      setDialogOpen(false);
      setForm({
        name: '',
        email: '',
        telephone: '',
        role: 'accueil',
        password: '',
        password_confirmation: '',
      });
      await loadEmployees();
    } catch {
      setError("Impossible d'ajouter l'employé.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardPageShell
      compact
      title="Personnel"
      subtitle="Gestion des employés"
      stripLabel="Équipe et accès"
      headerActions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="border-0 bg-white px-3 text-xs text-slate-900 shadow-sm hover:bg-white/90">
              <Plus size={14} className="mr-1.5" />
              Ajouter employé
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel employé</DialogTitle>
            </DialogHeader>
            <form className="form-surface mt-2 space-y-4 p-4" onSubmit={handleCreate}>
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                <Input
                  value={form.name}
                  onChange={(ev) => setForm((p) => ({ ...p, name: ev.target.value }))}
                  placeholder="Nom complet"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(ev) => setForm((p) => ({ ...p, email: ev.target.value }))}
                  type="email"
                  placeholder="email@bserp.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input
                  value={form.telephone}
                  onChange={(ev) => setForm((p) => ({ ...p, telephone: ev.target.value }))}
                  placeholder="+212 600 000 000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.role}
                  onChange={(ev) => setForm((p) => ({ ...p, role: ev.target.value as Role }))}
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Mot de passe</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(ev) => setForm((p) => ({ ...p, password: ev.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmation</Label>
                  <Input
                    type="password"
                    value={form.password_confirmation}
                    onChange={(ev) => setForm((p) => ({ ...p, password_confirmation: ev.target.value }))}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="max-h-[min(70vh,640px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedEmployes.map((emp) => (
            <EmployeCard key={emp.id} e={emp} />
          ))}
          {employes.length === 0 && <p className="text-muted-foreground">Aucun employé.</p>}
        </div>
      </div>

      {sortedEmployes.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {Math.min(page, totalPages)} sur {totalPages} — {sortedEmployes.length} employé
            {sortedEmployes.length > 1 ? 's' : ''}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="min-w-[5.5rem] text-center text-sm tabular-nums text-foreground">
                {Math.min(page, totalPages)} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </DashboardPageShell>
  );
}
