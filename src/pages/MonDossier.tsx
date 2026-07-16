import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed, Clock, FileText, FolderOpen, Loader2, XCircle } from 'lucide-react';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import {
  DOCUMENT_CATEGORY_META,
  formatDocumentDate,
  formatFileSize,
  REQUIRED_DOCUMENT_TYPES,
} from '@/constants/documentStatus';
import { DOCUMENT_TYPES } from '@/constants/documentTypes';
import { useMyDossier } from '@/hooks/useQueries';
import { Button } from '@/components/ui/button';
import { downloadDocumentFile } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface DossierDoc {
  id: string;
  nom: string;
  type: string;
  statut: string;
  taille?: number | null;
  date?: string | null;
}

function statusIcon(statut: string, present: boolean) {
  if (!present) return <XCircle className="h-4 w-4 text-red-500" />;
  if (statut === 'Validé') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (statut === 'Refusé' || statut === 'À remplacer') return <XCircle className="h-4 w-4 text-orange-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

export default function MonDossier() {
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get('client_id') ?? undefined;
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useMyDossier(
    clientIdParam ? { client_id: clientIdParam } : undefined,
  );

  const payload = data as {
    linked?: boolean;
    isOwner?: boolean;
    client?: { prenom: string; nom: string; email: string; destination?: string };
    progressPercent?: number;
    missingTypes?: string[];
    categories?: Array<{ type: string; present: boolean; count: number }>;
    documents?: DossierDoc[];
    dossiers?: Array<{ reference: string; statut: string }>;
  } | undefined;

  const grouped = useMemo(() => {
    const map = new Map<string, DossierDoc[]>();
    for (const doc of payload?.documents ?? []) {
      const list = map.get(doc.type) ?? [];
      list.push(doc);
      map.set(doc.type, list);
    }
    return map;
  }, [payload?.documents]);

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

  const clientName = payload?.client
    ? `${payload.client.prenom} ${payload.client.nom}`.trim()
    : 'Mon dossier';

  const progress = payload?.progressPercent ?? 0;

  const handleDownload = async (doc: DossierDoc) => {
    try {
      await downloadDocumentFile(doc.id, doc.nom);
    } catch (err) {
      toast({
        title: 'Téléchargement',
        description: err instanceof Error ? err.message : 'Impossible de télécharger.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardPageShell title="Mon dossier" subtitle="Chargement..." stripLabel="Espace étudiant">
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement de votre dossier...
        </div>
      </DashboardPageShell>
    );
  }

  if (isError || !payload?.linked) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'Aucun dossier étudiant n’est associé à votre compte.';
    return (
      <DashboardPageShell
        title="Mon dossier"
        subtitle="Espace personnel étudiant"
        stripLabel="Suivi de votre dossier"
      >
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{msg}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Utilisez l’email enregistré lors de l’inscription de votre dossier pour vous connecter.
          </p>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell
      title="Mon dossier"
      subtitle={payload.isOwner ? 'Suivez l’avancement de vos documents' : `Vue conseiller — ${clientName}`}
      stripLabel={payload.client?.destination ? `Destination : ${payload.client.destination}` : 'Documents et progression'}
    >
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">📂 Dossier de {clientName}</h2>
          <span className="text-lg font-bold tabular-nums text-emerald-700">{progress} %</span>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Progression globale du dossier</p>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {payload.dossiers && payload.dossiers.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Référence dossier : {payload.dossiers[0].reference} · Statut : {payload.dossiers[0].statut}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Documents obligatoires</h3>
          <ul className="space-y-2">
            {(payload.missingTypes
              ? [...REQUIRED_DOCUMENT_TYPES]
              : REQUIRED_DOCUMENT_TYPES
            ).map((type) => {
              const meta = DOCUMENT_CATEGORY_META[type] ?? { icon: '📄', label: type };
              const items = grouped.get(type) ?? [];
              const present = items.length > 0;
              const bestStatut = present ? items[0].statut : '';
              return (
                <li key={type} className="flex items-center gap-2 text-sm">
                  {statusIcon(bestStatut, present)}
                  <span className={present ? 'text-slate-800' : 'text-red-700'}>
                    {meta.icon} {meta.label}
                  </span>
                  {present && bestStatut === 'En attente' && (
                    <span className="text-xs text-amber-700">⏳ En attente de validation</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {(payload.missingTypes?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 text-sm text-orange-900">
            <h3 className="mb-2 font-semibold">Il vous manque encore</h3>
            <ul className="space-y-1">
              {payload.missingTypes!.map((type) => (
                <li key={type} className="flex items-center gap-2">
                  <CircleDashed className="h-4 w-4" />
                  {DOCUMENT_CATEGORY_META[type]?.label ?? type}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs">
              Contactez votre conseiller BSERP pour déposer les pièces manquantes.
            </p>
          </section>
        )}
      </div>

      <div className="space-y-4">
        {orderedTypes.map((type) => {
          const meta = DOCUMENT_CATEGORY_META[type] ?? { icon: '📄', label: type };
          const items = grouped.get(type) ?? [];
          if (items.length === 0 && !REQUIRED_DOCUMENT_TYPES.includes(type as (typeof REQUIRED_DOCUMENT_TYPES)[number])) {
            return null;
          }
          return (
            <section key={type} className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
              <header className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  {meta.icon} {meta.label}
                  {items.length > 1 ? ` (${items.length})` : ''}
                </h3>
              </header>
              {items.length === 0 ? (
                <p className="p-4 text-sm text-red-700">Document non déposé</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((doc) => (
                    <li key={doc.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="truncate font-medium">{doc.nom}</span>
                          <DocumentStatusBadge statut={doc.statut} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(doc.taille)} · Déposé le {formatDocumentDate(doc.date)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void handleDownload(doc)}>
                        Télécharger
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {!payload.isOwner && payload.client && (
        <div className="text-center">
          <Button asChild variant="outline">
            <Link to={`/documents/client/${clientIdParam}`}>Gérer le dossier (conseiller)</Link>
          </Button>
        </div>
      )}
    </DashboardPageShell>
  );
}
