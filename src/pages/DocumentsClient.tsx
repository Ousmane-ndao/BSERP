import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import {
  DOCUMENT_CATEGORY_META,
  DOCUMENT_STATUTS,
  formatDocumentDate,
  formatFileSize,
  isImageMime,
  isPdfMime,
  REQUIRED_DOCUMENT_TYPES,
} from '@/constants/documentStatus';
import { DOCUMENT_TYPES } from '@/constants/documentTypes';
import { useToast } from '@/hooks/use-toast';
import { useClient } from '@/hooks/useQueries';
import { documentsApi, downloadDocumentFile, extractApiErrorMessage } from '@/services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface DocumentRow {
  id: string;
  nom: string;
  type: string;
  statut: string;
  taille?: number | null;
  date?: string | null;
  mime?: string | null;
  dossierId?: string | null;
}

function groupByType(documents: DocumentRow[]): Map<string, DocumentRow[]> {
  const map = new Map<string, DocumentRow[]>();
  for (const doc of documents) {
    const list = map.get(doc.type) ?? [];
    list.push(doc);
    map.set(doc.type, list);
  }
  return map;
}

export default function DocumentsClient() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<DocumentRow | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: clientRes, isLoading: clientLoading } = useClient(clientId);
  const client = clientRes?.data as { prenom?: string; nom?: string; destination?: string } | undefined;
  const clientName = client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : 'Client';

  const { data: docsRes, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', 'client', clientId],
    queryFn: async () => {
      const res = await documentsApi.getAll({ client_id: clientId, per_page: '100' });
      return res.data;
    },
    enabled: !!clientId,
  });

  const documents = (docsRes?.data ?? []) as DocumentRow[];

  const grouped = useMemo(() => groupByType(documents), [documents]);

  const progress = useMemo(() => {
    let present = 0;
    const missing: string[] = [];
    for (const type of REQUIRED_DOCUMENT_TYPES) {
      const has = (grouped.get(type)?.length ?? 0) > 0;
      if (has) present++;
      else missing.push(type);
    }
    const total = REQUIRED_DOCUMENT_TYPES.length;
    return {
      percent: total > 0 ? Math.round((present / total) * 100) : 0,
      missing,
      present,
      total,
    };
  }, [grouped]);

  const orderedTypes = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const t of [...REQUIRED_DOCUMENT_TYPES, ...DOCUMENT_TYPES]) {
      if (!seen.has(t)) {
        seen.add(t);
        order.push(t);
      }
    }
    for (const t of grouped.keys()) {
      if (!seen.has(t)) order.push(t);
    }
    return order.filter((t) => grouped.has(t) || REQUIRED_DOCUMENT_TYPES.includes(t as (typeof REQUIRED_DOCUMENT_TYPES)[number]));
  }, [grouped]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['documents'] });
    void queryClient.invalidateQueries({ queryKey: ['documents_clients_summary'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
  }, [queryClient]);

  const handleDownload = async (doc: DocumentRow) => {
    setBusyId(doc.id);
    try {
      await downloadDocumentFile(doc.id, doc.nom);
    } catch (err) {
      toast({
        title: 'Téléchargement',
        description: await extractApiErrorMessage(err, 'Téléchargement impossible.'),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc: DocumentRow) => {
    if (!window.confirm(`Supprimer « ${doc.nom} » ?`)) return;
    setBusyId(doc.id);
    try {
      await documentsApi.delete(doc.id);
      toast({ title: 'Document supprimé' });
      invalidate();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: await extractApiErrorMessage(err, 'Suppression impossible.'),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (doc: DocumentRow, statut: string) => {
    setBusyId(doc.id);
    try {
      await documentsApi.update(doc.id, { statut });
      invalidate();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: await extractApiErrorMessage(err, 'Mise à jour impossible.'),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReplaceFile = async (file: File) => {
    if (!replaceTarget) return;
    setBusyId(replaceTarget.id);
    try {
      await documentsApi.update(replaceTarget.id, {}, file);
      toast({ title: 'Document remplacé' });
      setReplaceTarget(null);
      invalidate();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: await extractApiErrorMessage(err, 'Remplacement impossible.'),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const openPreview = async (doc: DocumentRow) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const res = await documentsApi.download(doc.id);
      const url = window.URL.createObjectURL(res.data);
      setPreviewUrl(url);
    } catch (err) {
      toast({
        title: 'Aperçu',
        description: await extractApiErrorMessage(err, 'Aperçu impossible.'),
        variant: 'destructive',
      });
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loading = clientLoading || docsLoading;

  return (
    <DashboardPageShell
      title={`Dossier — ${clientName}`}
      subtitle={client?.destination ? `Destination : ${client.destination}` : 'Documents regroupés par catégorie'}
      stripLabel="Dossier documentaire client"
      headerActions={
        <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate('/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      }
    >
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du dossier...
        </div>
      )}

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">Progression du dossier</span>
          <span className="font-semibold tabular-nums">{progress.percent} %</span>
        </div>
        <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documents obligatoires
            </h3>
            <ul className="space-y-1 text-sm">
              {REQUIRED_DOCUMENT_TYPES.map((type) => {
                const meta = DOCUMENT_CATEGORY_META[type] ?? { icon: '📄', label: type };
                const present = (grouped.get(type)?.length ?? 0) > 0;
                return (
                  <li key={type} className="flex items-center gap-2">
                    <span>{present ? '✅' : '❌'}</span>
                    <span className={present ? 'text-slate-800' : 'text-orange-700'}>
                      {meta.icon} {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {progress.missing.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-3 text-sm text-orange-900">
              <p className="font-medium">Documents manquants</p>
              <p className="mt-1">{progress.missing.map((t) => DOCUMENT_CATEGORY_META[t]?.label ?? t).join(' · ')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {orderedTypes.map((type) => {
          const meta = DOCUMENT_CATEGORY_META[type] ?? { icon: '📄', label: type };
          const items = grouped.get(type) ?? [];
          return (
            <section key={type} className="rounded-xl border border-slate-200/90 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  {meta.icon} {meta.label}
                </h2>
              </header>
              <div className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <p className="p-4 text-sm text-orange-700">Aucun document déposé pour cette catégorie.</p>
                ) : (
                  items.map((doc) => (
                    <div key={doc.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="truncate font-medium text-slate-900">{doc.nom}</span>
                          <DocumentStatusBadge statut={doc.statut} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(doc.taille)} · {formatDocumentDate(doc.date)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 rounded-md border border-input bg-card px-2 text-xs"
                          value={doc.statut}
                          disabled={busyId === doc.id}
                          onChange={(e) => void handleStatusChange(doc, e.target.value)}
                        >
                          {DOCUMENT_STATUTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" variant="outline" disabled={busyId === doc.id} onClick={() => void openPreview(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === doc.id} onClick={() => void handleDownload(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === doc.id}
                          onClick={() => {
                            setReplaceTarget(doc);
                            replaceInputRef.current?.click();
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === doc.id}
                          onClick={() => void handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleReplaceFile(file);
          e.target.value = '';
        }}
      />

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              {previewDoc?.nom}
            </DialogTitle>
          </DialogHeader>
          {previewLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement de l&apos;aperçu...
            </div>
          )}
          {!previewLoading && previewUrl && previewDoc && isImageMime(previewDoc.mime) && (
            <img src={previewUrl} alt={previewDoc.nom} className="max-h-[70vh] w-full rounded-lg object-contain" />
          )}
          {!previewLoading && previewUrl && previewDoc && isPdfMime(previewDoc.mime) && (
            <iframe title={previewDoc.nom} src={previewUrl} className="h-[70vh] w-full rounded-lg border" />
          )}
          {!previewLoading && previewUrl && previewDoc && !isImageMime(previewDoc.mime) && !isPdfMime(previewDoc.mime) && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aperçu non disponible pour ce type de fichier. Utilisez Télécharger.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </DashboardPageShell>
  );
}
