import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import {
  ClientDocumentCard,
  type ClientDocumentSummary,
} from '@/components/documents/ClientDocumentCard';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import {
  DOCUMENT_STATUTS,
  formatDocumentDate,
  formatFileSize,
  DOCUMENT_CATEGORY_META,
} from '@/constants/documentStatus';
import { DOCUMENT_TYPES } from '@/constants/documentTypes';
import { useToast } from '@/hooks/use-toast';
import { useDestinations, useDocuments, useDocumentsClientsSummary } from '@/hooks/useQueries';
import { documentsApi, dossiersApi, downloadDocumentFile, extractApiErrorMessage } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface DocumentItem {
  id: string;
  nom: string;
  type: string;
  statut: string;
  client: string;
  clientId?: string;
  dossierId?: string;
  taille?: number | null;
  date: string;
}

interface DossierOption {
  id: string;
  reference: string;
  client: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

type ViewMode = 'clients' | 'global';

export default function Documents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('clients');
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadForm, setUploadForm] = useState({
    dossier_id: '',
    type_document: 'CNI ou Passeport' as string,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dossiers, setDossiers] = useState<DossierOption[]>([]);
  const [dossiersLoaded, setDossiersLoaded] = useState(false);

  const { data: destinationsData } = useDestinations();
  const destinations = (destinationsData ?? []) as Array<{ id: number; name: string }>;

  const globalParams = useMemo(
    () => ({
      per_page: '20',
      page: String(page),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(filterType ? { type_document: filterType } : {}),
      ...(filterStatut ? { statut: filterStatut } : {}),
      ...(filterDestination ? { destination_id: filterDestination } : {}),
      ...(filterDateFrom ? { date_from: filterDateFrom } : {}),
      ...(filterDateTo ? { date_to: filterDateTo } : {}),
    }),
    [page, search, filterType, filterStatut, filterDestination, filterDateFrom, filterDateTo],
  );

  const clientSummaryParams = useMemo(
    () => ({
      limit: '100',
      ...(clientSearch.trim() ? { search: clientSearch.trim() } : {}),
      ...(filterDestination ? { destination_id: filterDestination } : {}),
    }),
    [clientSearch, filterDestination],
  );

  const { data: summaryRes, isLoading: summaryLoading } = useDocumentsClientsSummary(clientSummaryParams);
  const { data: docsRes, isLoading: globalLoading, error: docsError } = useDocuments(
    viewMode === 'global' ? globalParams : undefined,
  );

  const clientSummaries = (summaryRes?.data ?? []) as ClientDocumentSummary[];
  const documents = (docsRes?.data ?? []) as DocumentItem[];
  const meta = (docsRes?.meta ?? null) as PaginationMeta | null;

  useEffect(() => {
    if (dialogOpen && !dossiersLoaded) {
      void (async () => {
        try {
          const res = await dossiersApi.getOptions();
          setDossiers((res.data?.data ?? []) as DossierOption[]);
          setDossiersLoaded(true);
        } catch {
          setError('Impossible de charger les dossiers.');
        }
      })();
    }
  }, [dialogOpen, dossiersLoaded]);

  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterStatut, filterDestination, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (!docsError) return;
    if (axios.isAxiosError(docsError)) {
      const apiMessage = docsError.response?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Service documents temporairement indisponible.');
      return;
    }
    setError('Service documents temporairement indisponible.');
  }, [docsError]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['documents'] });
    void queryClient.invalidateQueries({ queryKey: ['documents_clients_summary'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadForm.dossier_id || !selectedFile) return;
    setUploading(true);
    try {
      await documentsApi.upload(uploadForm.dossier_id, selectedFile, uploadForm.type_document);
      setDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ dossier_id: '', type_document: 'CNI ou Passeport' });
      toast({ title: 'Document envoyé', description: 'Le document a été téléversé avec succès.' });
      invalidate();
    } catch (err: unknown) {
      setError(await extractApiErrorMessage(err, "L'upload a échoué."));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await documentsApi.delete(id);
      toast({ title: 'Document supprimé' });
      invalidate();
    } catch (err: unknown) {
      setError(await extractApiErrorMessage(err, 'Suppression impossible.'));
    }
  };

  const handleDownload = async (id: string, name: string) => {
    setError('');
    try {
      await downloadDocumentFile(id, name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Téléchargement impossible.';
      setError(msg);
      toast({ title: 'Téléchargement', description: msg, variant: 'destructive' });
    }
  };

  const uploadDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="border-0 bg-white text-slate-900 shadow-sm hover:bg-white/90">
          <Upload size={16} className="mr-2" />
          Uploader
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Uploader un document</DialogTitle>
          <DialogDescription>Choisissez le dossier, la catégorie et le fichier à envoyer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpload} className="form-surface space-y-4 p-4">
          <div className="space-y-1.5">
            <Label>Dossier</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={uploadForm.dossier_id}
              onChange={(e) => setUploadForm((p) => ({ ...p, dossier_id: e.target.value }))}
              required
            >
              <option value="">Sélectionner</option>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.reference} — {d.client}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Catégorie</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={uploadForm.type_document}
              onChange={(e) => setUploadForm((p) => ({ ...p, type_document: e.target.value }))}
              required
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_CATEGORY_META[t]?.icon ?? '📄'} {DOCUMENT_CATEGORY_META[t]?.label ?? t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Fichier</Label>
            <input
              ref={fileInput}
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? 'Upload...' : 'Envoyer'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <DashboardPageShell
      title="Documents"
      subtitle="Gestion documentaire par client et vue globale"
      stripLabel="Bibliothèque et suivi des pièces"
      headerActions={uploadDialog}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'clients' ? 'default' : 'ghost'}
            onClick={() => setViewMode('clients')}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            Par client
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'global' ? 'default' : 'ghost'}
            onClick={() => setViewMode('global')}
          >
            <List className="mr-2 h-4 w-4" />
            Vue globale
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            className="h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm"
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
          >
            <option value="">Toutes destinations</option>
            {destinations.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
          {viewMode === 'global' && (
            <>
              <select
                className="h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Toutes catégories</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_CATEGORY_META[t]?.label ?? t}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-card px-3 text-sm shadow-sm"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                <option value="">Tous statuts</option>
                {DOCUMENT_STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="h-10 w-full sm:w-auto" />
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="h-10 w-full sm:w-auto" />
            </>
          )}
        </div>
      </div>

      {viewMode === 'clients' ? (
        <>
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="bg-card pl-9 shadow-sm"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>

          {summaryLoading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des dossiers clients...
            </div>
          ) : clientSummaries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-muted-foreground">
              Aucun client avec dossier trouvé.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {clientSummaries.map((summary) => (
                <ClientDocumentCard
                  key={summary.clientId}
                  summary={summary}
                  onOpen={(id) => navigate(`/documents/client/${id}`)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="bg-card pl-9 shadow-sm"
              placeholder="Rechercher par nom, client ou catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
            <div className="max-h-[min(70vh,560px)] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <tr className="border-b">
                    <th className="p-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="hidden p-3 text-left font-medium text-muted-foreground sm:table-cell">Catégorie</th>
                    <th className="p-3 text-left font-medium text-muted-foreground">Fichier</th>
                    <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">Taille</th>
                    <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">Date</th>
                    <th className="hidden p-3 text-left font-medium text-muted-foreground md:table-cell">Statut</th>
                    <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {globalLoading && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </span>
                      </td>
                    </tr>
                  )}
                  {!globalLoading && documents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Aucun document
                      </td>
                    </tr>
                  )}
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => d.clientId && navigate(`/documents/client/${d.clientId}`)}
                        >
                          {d.client}
                        </button>
                      </td>
                      <td className="hidden p-3 text-muted-foreground sm:table-cell">
                        {DOCUMENT_CATEGORY_META[d.type]?.icon ?? '📄'}{' '}
                        {DOCUMENT_CATEGORY_META[d.type]?.label ?? d.type}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{d.nom}</span>
                        </div>
                      </td>
                      <td className="hidden p-3 text-muted-foreground md:table-cell">{formatFileSize(d.taille)}</td>
                      <td className="hidden p-3 text-muted-foreground lg:table-cell">{formatDocumentDate(d.date)}</td>
                      <td className="hidden p-3 md:table-cell">
                        <DocumentStatusBadge statut={d.statut} />
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          {d.clientId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Voir le dossier client"
                              onClick={() => navigate(`/documents/client/${d.clientId}`)}
                            >
                              <Eye size={15} />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title="Télécharger" onClick={() => void handleDownload(d.id, d.nom)}>
                            <Download size={15} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:text-destructive"
                            title="Supprimer"
                            onClick={() => void handleDelete(d.id)}
                          >
                            <Trash2 size={15} />
                          </Button>
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
                Page {meta?.current_page ?? 1} sur {meta?.last_page ?? 1} — {meta?.total ?? 0} document
                {(meta?.total ?? 0) > 1 ? 's' : ''}
              </p>
              {(meta?.last_page ?? 1) > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Précédent
                  </Button>
                  <span className="text-sm tabular-nums">
                    {meta?.current_page ?? 1} / {meta?.last_page ?? 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (meta?.last_page ?? 1)}
                    onClick={() => setPage((p) => Math.min(meta?.last_page ?? 1, p + 1))}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardPageShell>
  );
}
