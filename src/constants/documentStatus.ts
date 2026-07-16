export const DOCUMENT_STATUTS = ['En attente', 'Validé', 'Refusé', 'À remplacer'] as const;

export type DocumentStatut = (typeof DOCUMENT_STATUTS)[number];

export const DOCUMENT_STATUT_STYLES: Record<
  DocumentStatut,
  { label: string; dot: string; badge: string }
> = {
  'En attente': {
    label: 'En attente',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  Validé: {
    label: 'Validé',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  Refusé: {
    label: 'Refusé',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-200',
  },
  'À remplacer': {
    label: 'À remplacer',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-800 border-orange-200',
  },
};

export const DOCUMENT_CATEGORY_META: Record<
  string,
  { icon: string; label: string; required?: boolean }
> = {
  Photo: { icon: '📷', label: 'Photo', required: true },
  'CNI ou Passeport': { icon: '🪪', label: 'CNI / Passeport', required: true },
  "Certificat d'inscription": { icon: '🎓', label: "Certificat d'inscription", required: true },
  'Relevé de notes Bac': { icon: '📄', label: 'Relevé du Bac', required: true },
  'Bulletins de notes': { icon: '📚', label: 'Bulletins de notes', required: true },
  'Diplôme Bac': { icon: '🎓', label: 'Diplôme Bac' },
  Travail: { icon: '📝', label: 'Travaux' },
  CV: { icon: '📋', label: 'CV' },
};

export const REQUIRED_DOCUMENT_TYPES = [
  'Photo',
  'CNI ou Passeport',
  "Certificat d'inscription",
  'Relevé de notes Bac',
  'Bulletins de notes',
] as const;

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatDocumentDate(iso?: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function isImageMime(mime?: string | null): boolean {
  return Boolean(mime?.startsWith('image/'));
}

export function isPdfMime(mime?: string | null): boolean {
  return mime === 'application/pdf';
}
