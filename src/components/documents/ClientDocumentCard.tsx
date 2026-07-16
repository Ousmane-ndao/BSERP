import { ChevronRight, FolderOpen, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOCUMENT_CATEGORY_META } from '@/constants/documentStatus';

export interface ClientDocumentSummary {
  clientId: string;
  clientName: string;
  destination?: string | null;
  documentCount: number;
  progressPercent: number;
  missingTypes: string[];
  categories: Array<{
    type: string;
    present: boolean;
    count: number;
    validated: number;
    pending: number;
    refused: number;
  }>;
}

interface ClientDocumentCardProps {
  summary: ClientDocumentSummary;
  onOpen: (clientId: string) => void;
}

export function ClientDocumentCard({ summary, onOpen }: ClientDocumentCardProps) {
  const progress = summary.progressPercent;
  const barColor =
    progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-amber-500' : 'bg-orange-500';

  return (
    <article className="flex flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <User className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900">{summary.clientName}</h3>
          <p className="text-xs text-muted-foreground">
            {summary.destination ?? 'Destination non renseignée'} · {summary.documentCount} document
            {summary.documentCount > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progression du dossier</span>
          <span className="font-semibold tabular-nums text-slate-800">{progress} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="mb-4 space-y-1.5 text-sm">
        {summary.categories.slice(0, 5).map((cat) => {
          const meta = DOCUMENT_CATEGORY_META[cat.type] ?? { icon: '📄', label: cat.type };
          const ok = cat.present && cat.refused === 0;
          const warn = cat.present && cat.refused > 0;
          return (
            <li key={cat.type} className="flex items-center justify-between gap-2 text-slate-700">
              <span className="truncate">
                {meta.icon} {meta.label}
                {cat.count > 1 ? ` (${cat.count})` : ''}
              </span>
              <span className="shrink-0 text-xs">
                {!cat.present ? '❌' : warn ? '🟠' : '✅'}
              </span>
            </li>
          );
        })}
        {summary.missingTypes.length > 0 && (
          <li className="text-xs text-orange-700">
            Manquant : {summary.missingTypes.slice(0, 2).join(', ')}
            {summary.missingTypes.length > 2 ? '…' : ''}
          </li>
        )}
      </ul>

      <Button variant="outline" className="mt-auto w-full justify-between" onClick={() => onOpen(summary.clientId)}>
        <span className="inline-flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Voir le dossier
        </span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </article>
  );
}
