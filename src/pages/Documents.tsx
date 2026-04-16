import { FileText, Download, Trash2, Search, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { documentsApi, dossiersApi } from '@/services/api';
import { DOCUMENT_TYPES } from '@/constants/documentTypes';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dossiers, setDossiers] = useState<DossierOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const { toast } = useToast();
  const [uploadForm, setUploadForm] = useState({
    dossier_id: '',
    type_document: 'CNI ou Passeport' as string,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [docsRes, dossiersRes] = await Promise.all([
        documentsApi.getAll({
          per_page: '20',
          page: String(page),
          ...(search.trim() ? { search: search.trim() } : {}),
        }),
        dossiersApi.getOptions(),
      ]);
      setDocuments((docsRes.data?.data ?? []) as DocumentItem[]);
      setMeta((docsRes.data?.meta ?? null) as PaginationMeta | null);
      setDossiers((dossiersRes.data?.data ?? []) as DossierOption[]);
    } catch {
      setError('Impossible de charger les documents.');
      toast({
        title: 'Erreur',
        description: 'Le chargement des documents a échoué.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
      await loadData();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const data = ax.response?.data;
      const fromFields = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
      setError(fromFields || data?.message || "L'upload a échoué.");
      toast({
        title: 'Erreur',
        description: fromFields || data?.message || "L'upload a échoué.",
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce document ?')) return;
    try {
      await documentsApi.delete(id);
      try {
        await documentsApi.getById(id);
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
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setMeta((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          total: Math.max(0, prev.total - 1),
        };
      });
      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé.',
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

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await documentsApi.download(id);
      const blob = new Blob([response.data]);
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setError('Téléchargement impossible.');
      toast({
        title: 'Erreur',
        description: 'Le téléchargement a échoué.',
        variant: 'destructive',
      });
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
