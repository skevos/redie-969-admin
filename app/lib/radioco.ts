import { createHmac } from 'crypto';
import { getSessionSecret, safeEqual } from './session';

// Token for the "Ενημέρωση από Radio.co" bookmarklet: derived from SESSION_SECRET (no extra env var).
export function radiocoImportToken(): string | null {
  const s = getSessionSecret();
  if (!s) return null;
  return createHmac('sha256', s).update('radioco-import-v1').digest('hex').slice(0, 40);
}
export function checkRadiocoToken(t: string | null | undefined): boolean {
  const ok = radiocoImportToken();
  return !!ok && !!t && safeEqual(t, ok);
}

// Which Radio.co "client" names belong to which source
export const RADIOCO_GROUPS: { key: string; label: string; match: (c: string) => boolean }[] = [
  { key: 'android_app', label: '📱 Εφαρμογή Android', match: c => c === 'Just Audio' },
  { key: 'iphone', label: '🍏 iPhone (εφαρμογή / Safari)', match: c => c === 'Mobile Safari' || c === 'Chrome Mobile iOS' },
  { key: 'desktop', label: '💻 Site / υπολογιστές', match: c => ['Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Opera', 'Edge'].includes(c) },
  { key: 'alexa', label: '🔊 Alexa / Amazon', match: c => c === 'Mobile Silk' || /alexa|amazon|silk/i.test(c) },
  { key: 'mobile_web', label: '📲 Browser κινητού', match: c => /mobile|samsung/i.test(c) },
];
export function groupOf(client: string): string {
  if (!client || client === 'Unknown') return 'bot';
  for (const g of RADIOCO_GROUPS) if (g.match(client)) return g.key;
  return 'other';
}
