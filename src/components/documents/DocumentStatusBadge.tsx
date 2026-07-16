import { DOCUMENT_STATUT_STYLES, type DocumentStatut } from '@/constants/documentStatus';

export function DocumentStatusBadge({ statut }: { statut: string }) {
  const key = (DOCUMENT_STATUT_STYLES[statut as DocumentStatut]
    ? statut
    : 'En attente') as DocumentStatut;
  const style = DOCUMENT_STATUT_STYLES[key];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
