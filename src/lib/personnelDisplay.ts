/** Nettoie un nom affiché (ex. données erronées « MARYLAND » collées au nom). */
export function formatPersonnelName(raw: string): string {
  const t = raw?.trim() ?? '';
  if (!t) return '';
  let s = t.replace(/\bMARYLAND\b/giu, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s || t;
}
