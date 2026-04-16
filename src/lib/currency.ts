/** Devise affichée côté UI (alignée sur le backend XOF / FCFA). */
export const APP_CURRENCY_CODE = (import.meta.env.VITE_CURRENCY_CODE as string | undefined) ?? 'XOF';

export const APP_CURRENCY_LABEL = (import.meta.env.VITE_CURRENCY_LABEL as string | undefined) ?? 'FCFA';

export function formatMoneyAmount(amount: number | string, options?: { minimumFractionDigits?: number }): string {
  const n = Number(amount);
  const fraction = options?.minimumFractionDigits ?? 0;
  return n.toLocaleString('fr-FR', { minimumFractionDigits: fraction, maximumFractionDigits: 2 });
}

/** Ex. 12 345 FCFA */
export function formatMoneyWithLabel(amount: number | string): string {
  return `${formatMoneyAmount(amount)} ${APP_CURRENCY_LABEL}`;
}

/** Libellé lisible pour un code ISO renvoyé par l’API (XOF → FCFA). */
export function labelForCurrencyCode(code?: string | null): string {
  const c = (code || APP_CURRENCY_CODE).toUpperCase();
  if (c === 'XOF') return APP_CURRENCY_LABEL;
  return c;
}
