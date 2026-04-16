import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { clientsApi, destinationsApi } from '@/services/api';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DASH_GREEN } from '@/lib/dashboardTheme';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  etablissement: string;
  niveauEtude: string;
  destination: string;
  dateOuverture: string;
  statut: string;
  destinationId?: number;
}

interface Destination {
  id: number;
  name: string;
  region?: string | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Ordre d’affichage des zones (Europe en premier pour la France, etc.) */
const REGION_ORDER = ['Europe', 'Asie', 'Amérique', 'Afrique'] as const;

const initialForm = {
  prenom: '',
  nom: '',
  date_naissance: '',
  telephone: '',
  email: '',
  etablissement: '',
  niveau_etude: '',
  destination_id: '',
  date_ouverture: '',
};

export default function Clients() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterDestination, setFilterDestination] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [clientsRes, destinationsRes] = await Promise.all([
        clientsApi.getAll({
          per_page: '20',
          page: String(page),
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(filterDestination ? { destination_id: filterDestination } : {}),
        }),
        destinationsApi.getAll(),
      ]);
      setClients((clientsRes.data?.data ?? []) as Client[]);
      setMeta((clientsRes.data?.meta ?? null) as PaginationMeta | null);
      setDestinations((destinationsRes.data ?? []) as Destination[]);
    } catch {
      setError('Impossible de charger les clients.');
      toast({
        title: 'Erreur',
        description: 'Le chargement des clients a échoué.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [page, search, filterDestination]);

  const openCreate = () => {
    setEditingClientId(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClientId(client.id);
    setForm({
      prenom: client.prenom ?? '',
      nom: client.nom ?? '',
      date_naissance: client.dateNaissance ?? '',
      telephone: client.telephone ?? '',
      email: client.email ?? '',
      etablissement: client.etablissement ?? '',
      niveau_etude: client.niveauEtude ?? '',
      destination_id: client.destinationId ? String(client.destinationId) : '',
      date_ouverture: client.dateOuverture ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.destination_id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        destination_id: Number(form.destination_id),
      };
      if (editingClientId) {
        await clientsApi.update(editingClientId, payload);
      } else {
        await clientsApi.create(payload);
      }
      setDialogOpen(false);
      toast({
        title: editingClientId ? 'Client mis à jour' : 'Client créé',
        description: 'Les informations ont été enregistrées.',
      });
      await loadData();
    } catch {
      setError("Échec de l'enregistrement du client.");
      toast({
        title: 'Erreur',
        description: "L'enregistrement du client a échoué.",
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    try {
      await clientsApi.delete(id);
      try {
        await clientsApi.getById(id);
        throw new Error('DELETE_NOT_CONFIRMED');
      } catch (verifyErr: unknown) {
        const ax = verifyErr as { response?: { status?: number }; message?: string };
        const status = ax.response?.status;
        if (status !== 404 && ax.message === 'DELETE_NOT_CONFIRMED') {
          throw verifyErr;
        }
        if (status !== 404 && ax.message !== 'DELETE_NOT_CONFIRMED') {
          throw verifyErr;
        }
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      setMeta((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          total: Math.max(0, prev.total - 1),
        };
      });
      toast({
        title: 'Client supprimé',
        description: 'Le client a été supprimé avec succès.',
      });
      void loadData();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const msg = ax.response?.data?.message || 'Suppression impossible.';
      setError(msg);
      toast({
        title: 'Erreur',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, filterDestination]);

  const destinationOptions = useMemo(
    () => destinations.map((d) => ({ id: String(d.id), name: d.name })),
    [destinations]
  );

  /** Destinations API regroupées par zone pour &lt;optgroup&gt; */
  const destinationsByRegion = useMemo(() => {
    const groups = new Map<string, Destination[]>();
    for (const d of destinations) {
      const r = (d.region && String(d.region).trim()) || 'Autres';
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r)!.push(d);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    const ordered: { region: string; items: Destination[] }[] = [];
    for (const r of REGION_ORDER) {
      const items = groups.get(r);
      if (items?.length) ordered.push({ region: r, items });
    }
    const rest = [...groups.keys()]
      .filter((k) => !(REGION_ORDER as readonly string[]).includes(k))
      .sort((a, b) => a.localeCompare(b, 'fr'));
    for (const r of rest) {
      const items = groups.get(r);
      if (items?.length) ordered.push({ region: r, items });
    }
    return ordered;
  }, [destinations]);

  return (
    <DashboardPageShell
      title="Clients"
      subtitle={`${meta?.total ?? clients.length} clients enregistrés`}
      stripLabel="Annuaire et suivi clients"
      headerActions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="border-0 bg-white text-slate-900 shadow-sm hover:bg-white/90" onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[min(92vh,720px)] w-[calc(100vw-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:rounded-xl">
            <DialogHeader className="shrink-0 border-b border-border/80 bg-muted/30 px-6 py-4 text-left">
              <DialogTitle>{editingClientId ? 'Modifier client' : 'Ajouter un client'}</DialogTitle>
              <DialogDescription>
                Renseignez les informations du client et choisissez le pays de destination (par zone : Europe, Asie, Amérique, Afrique).
              </DialogDescription>
            </DialogHeader>
            <form className="form-surface min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4" onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="client-prenom">Prénom</Label>
                  <Input id="client-prenom" value={form.prenom} onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))} placeholder="Prénom" autoComplete="given-name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-nom">Nom</Label>
                  <Input id="client-nom" value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} placeholder="Nom" autoComplete="family-name" required />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="client-naiss">Date de naissance</Label>
                  <Input id="client-naiss" type="date" value={form.date_naissance} onChange={(e) => setForm((p) => ({ ...p, date_naissance: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Format sélection : jj/mm/aaaa</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-tel">Téléphone</Label>
                  <Input id="client-tel" type="tel" value={form.telephone} onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))} placeholder="+212 600 000 000" autoComplete="tel" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-email">Email</Label>
                <Input id="client-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@exemple.com" autoComplete="email" required />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="client-etab">Établissement</Label>
                  <Input id="client-etab" value={form.etablissement} onChange={(e) => setForm((p) => ({ ...p, etablissement: e.target.value }))} placeholder="Nom de l'établissement" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-niveau">Niveau d'étude</Label>
                  <Input id="client-niveau" value={form.niveau_etude} onChange={(e) => setForm((p) => ({ ...p, niveau_etude: e.target.value }))} placeholder="Licence 3, Master 1..." />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="client-dest">Destination</Label>
                  <select
                    id="client-dest"
                    className="h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.destination_id}
                    onChange={(e) => setForm((p) => ({ ...p, destination_id: e.target.value }))}
                    required
                  >
                    <option value="">Sélectionner</option>
                    {destinationsByRegion.map(({ region, items }) => (
                      <optgroup key={region} label={region}>
                        {items.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Europe · Asie · Amérique · Afrique</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="client-date-ouv">Date ouverture dossier</Label>
                  <Input id="client-date-ouv" type="date" value={form.date_ouverture} onChange={(e) => setForm((p) => ({ ...p, date_ouverture: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">jj/mm/aaaa</p>
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

      {/* Search + Filter */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 bg-card shadow-sm"
            placeholder="Rechercher (nom, email, téléphone, niveau, destination)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 w-full min-w-0 max-w-full shrink-0 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-[240px] sm:text-ellipsis"
          title={filterDestination || undefined}
          value={filterDestination}
          onChange={(e) => setFilterDestination(e.target.value)}
        >
          <option value="">Toutes destinations</option>
          {destinationOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table — max-h + scroll + en-tête collant (comme Documents) */}
      <div className="table-container overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-md">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Liste des clients</h2>
        </div>
        <div className="max-h-[min(70vh,520px)] overflow-auto">
        <table className="w-full max-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 shadow-sm backdrop-blur-sm">
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium text-muted-foreground">Prénom & Nom</th>
              <th className="hidden p-3 text-left font-medium text-muted-foreground sm:table-cell">Téléphone</th>
              <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">Niveau</th>
              <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">Destination</th>
              <th className="whitespace-nowrap p-3 text-left font-medium text-muted-foreground">Statut</th>
              <th className="w-24 whitespace-nowrap p-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && clients.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Aucun client trouvé</td></tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des clients...
                  </span>
                </td>
              </tr>
            )}
            {clients.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">
                  <span
                    className="block max-w-[11rem] truncate sm:max-w-[13rem] lg:max-w-[15rem]"
                    title={`${c.prenom} ${c.nom}`.trim()}
                  >
                    {c.prenom} {c.nom}
                  </span>
                </td>
                <td className="hidden p-3 text-muted-foreground sm:table-cell">
                  <span className="block max-w-[8rem] truncate md:max-w-[9rem]" title={c.telephone || undefined}>
                    {c.telephone}
                  </span>
                </td>
                <td className="hidden p-3 text-muted-foreground md:table-cell">
                  <span className="block max-w-[9rem] truncate lg:max-w-[10rem]" title={c.niveauEtude || undefined}>
                    {c.niveauEtude}
                  </span>
                </td>
                <td className="hidden p-3 text-muted-foreground lg:table-cell">
                  <span
                    className="block max-w-[9rem] truncate xl:max-w-[12rem]"
                    title={c.destination || undefined}
                  >
                    {c.destination}
                  </span>
                </td>
                <td className="p-3">
                  {c.statut === 'Actif' ? (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                      style={{ backgroundColor: DASH_GREEN }}
                    >
                      {c.statut}
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                      {c.statut}
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => navigate(`/clients/${c.id}/dossier-etudiant`)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Dossier étudiant (comptes & suivi)"
                    >
                      <GraduationCap size={15} />
                    </button>
                    <button onClick={() => navigate(`/dossiers?client=${c.id}`)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Dossiers"><Eye size={15} /></button>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Modifier"><Edit size={15} /></button>
                    <button onClick={() => void handleDelete(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Supprimer"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {(meta?.total ?? 0) > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta?.current_page ?? 1} sur {meta?.last_page ?? 1} — {meta?.total ?? 0} client
            {(meta?.total ?? 0) > 1 ? 's' : ''}
            {search || filterDestination ? ' (filtrés)' : ''}
          </p>
          {(meta?.last_page ?? 1) > 1 && (
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
                {meta?.current_page ?? 1} / {meta?.last_page ?? 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (meta?.last_page ?? 1)}
                onClick={() => setPage((p) => Math.min(meta?.last_page ?? 1, p + 1))}
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
