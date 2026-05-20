import { FileText, Download, Trash2, Search, Upload, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { documentsApi, dossiersApi, downloadDocumentFile } from '@/services/api';
import { DOCUMENT_TYPES } from '@/constants/documentTypes';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useDocuments } from '@/hooks/useQueries';
import axios from 'axios';

interface DocumentItem {
  id: string;
  nom: string;
  type: string;
  client: string;
  dossierId?: string;
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

export default function Documents() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const [uploadForm, setUploadForm] = useState({
    dossier_id: '',
    type_document: 'CNI ou Passeport' as string,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // For dossier options, we keep it simple or we could use another query
  const [dossiers, setDossiers] = useState<DossierOption[]>([]);
  const [dossiersLoaded, setDossiersLoaded] = useState(false);

  const queryParams = useMemo(() => ({
    per_page: '20',
    page: String(page),
    ...(search.trim() ? { search: search.trim() } : {}),
  }), [page, search]);

  const { data: docsRes, isLoading: loading, error: docsError } = useDocuments(queryParams);

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
  }, [search]);

  useEffect(() => {
    if (!docsError) return;
    if (axios.isAxiosError(docsError)) {
      const apiMessage = docsError.response?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Service documents temporairement indisponible.');
      return;
    }
    setError('Service documents temporairement indisponible.');
  }, [docsError]);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadForm.dossier_id || !selectedFile) return;
    setUploading(true);
    try {
      await documentsApi.upload(uploadForm.dossier_id, selectedFile, uploadForm.type_document);
      setDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ dossier_id: '', type_document: 'CNI ou Passeport' });
      toast({
        title: 'Document envoyé',
        description: 'Le document a été téléversé avec succès.',
      });
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      // Also invalidate dashboard if needed
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const data = ax.response?.data;
      const fromFields = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
      setError(fromFields || data?.message || "L'upload a échoué.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await documentsApi.delete(id);
      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé.',
      });
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const msg = ax.response?.data?.message || 'Suppression impossible.';
      setError(msg);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      await downloadDocumentFile(id, name);
      setError('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Téléchargement impossible.';
      setError(msg);
      toast({ title: 'Téléchargement', description: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Documents</h1>
          <p className="page-subtitle">Bibliothèque de documents</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Upload size={16} className="mr-2" />Uploader</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uploader un document</DialogTitle>
              <DialogDescription>Choisissez le dossier, le type de document et le fichier à envoyer.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="form-surface space-y-4 p-4">
              <div className="space-y-1.5">
                <Label>Dossier</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={uploadForm.dossier_id}
                  onChange={(e) => setUploadForm((p) => ({ ...p, dossier_id: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner</option>
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.id}>{d.reference} - {d.client}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Type de document</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={uploadForm.type_document}
                  onChange={(e) => setUploadForm((p) => ({ ...p, type_document: e.target.value }))}
                  required
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                  className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:brightness-95"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'Upload...' : 'Envoyer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 bg-card shadow-sm"
          placeholder="Rechercher par nom, client ou type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-border/80 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 shadow-sm backdrop-blur-sm">
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Document</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Client</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Date upload</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && documents.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Aucun document</td></tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des documents...
                  </span>
                </td>
              </tr>
            )}
            {documents.map((d) => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="font-medium">{d.nom}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground hidden sm:table-cell">{d.type}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{d.client}</td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell">{d.date}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Télécharger" onClick={() => void handleDownload(d.id, d.nom)}><Download size={15} /></Button>
                    <Button size="sm" variant="ghost" className="hover:text-destructive" title="Supprimer" onClick={() => void handleDelete(d.id)}><Trash2 size={15} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(meta?.total ?? 0) > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta?.current_page ?? 1} sur {meta?.last_page ?? 1} — {meta?.total ?? 0} document{(meta?.total ?? 0) > 1 ? 's' : ''}
            {search ? ' (filtrés)' : ''}
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
    </div>
  );
}
