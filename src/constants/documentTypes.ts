/**
 * Types de documents alignés sur StoreDocumentRequest (backend Laravel).
 * Ne pas inventer de libellés ici : ils doivent correspondre à la validation API.
 */
export const DOCUMENT_TYPES = [
  'Bulletins de notes',
  'Diplôme Bac',
  "Certificat d'inscription",
  'Relevé de notes Bac',
  'Travail',
  'Photo',
  'CNI ou Passeport',
  'CV',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
