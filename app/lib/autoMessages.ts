// Automatic chat notifications. Texts are editable in App Content (settings.msg_*).
// The defaults below are the original texts; they apply when a field is missing (e.g. before the SQL ran).
// An empty title in settings means "do not send this notification".
export const AUTO_MESSAGE_DEFAULTS = {
  msg_chat_open_title: '💬 Το Chat Άνοιξε!',
  msg_chat_open_body: 'Έλα να μιλήσεις μαζί μας live!',
  msg_chat_close_title: '📴 Το Chat Έκλεισε',
  msg_chat_close_body: 'Ευχαριστούμε για τη συμμετοχή σας! Τα λέμε σύντομα.',
  msg_auto_soon_title: '💬 Το Chat Άνοιξε!',
  msg_auto_soon_body: 'Ξεκινάει σύντομα: {εκπομπή} - Έλα να μιλήσεις μαζί μας!',
  msg_auto_live_title: '🎙️ Live Τώρα!',
  msg_auto_live_body: '{εκπομπή} - Έλα στο chat!',
  msg_auto_close_title: '',
  msg_auto_close_body: '',
};

export type AutoMessageKey = keyof typeof AUTO_MESSAGE_DEFAULTS;
export const AUTO_MESSAGE_COLUMNS = Object.keys(AUTO_MESSAGE_DEFAULTS).join(', ');

// settings row (may lack the columns) -> full set of texts
export function resolveAutoMessages(row: any): Record<AutoMessageKey, string> {
  const out = { ...AUTO_MESSAGE_DEFAULTS };
  for (const k of Object.keys(AUTO_MESSAGE_DEFAULTS) as AutoMessageKey[]) {
    if (row && typeof row[k] === 'string') out[k] = row[k];
  }
  return out;
}

export function fillTemplate(text: string, vars: { show?: string | null }): string {
  return String(text || '').replace(/\{εκπομπή\}/g, vars.show || '').replace(/\s+/g, ' ').trim();
}
