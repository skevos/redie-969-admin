# REDIE 969 Dashboard — Server-side Auth

## 1. Env vars στο Vercel (Settings → Environment Variables → Production)

| Όνομα | Τιμή |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → **service_role** (ή **secret** key). ΠΟΤΕ με πρόθεμα `NEXT_PUBLIC_`. |
| `SESSION_SECRET` | Τυχαίο string 48+ χαρακτήρων, π.χ. `openssl rand -base64 48` |
| `CRON_SECRET` (προαιρετικό) | Τυχαίο string. Όποιο cron καλεί το `/api/auto-chat` πρέπει να στέλνει header `Authorization: Bearer <CRON_SECRET>` (το Vercel Cron το κάνει αυτόματα). |

Αν λείπει το `SESSION_SECRET`, το dashboard **δεν κλειδώνει** (fail-open, warning στα logs) για να μη μείνει ο owner έξω.

## 2. Κωδικοί
- Τα passwords (dashboard_users και producers) γίνονται **bcrypt αυτόματα** στο πρώτο επιτυχημένο login κάθε χρήστη. Δεν χρειάζεται τίποτα χειροκίνητα.
- Νέοι χρήστες / αλλαγές κωδικού (Users & Roles, Producers) αποθηκεύονται κατευθείαν ως bcrypt.

## 3. URLs
- Login: `/login`
- Αποσύνδεση: `/logout`
- Δημόσια: `/app` (QR), `/privacy.html`, `/terms.html`, `/privacy-policy.html`, `/producer-chat` (δικό του login)

## 4. Σειρά deploy
1. Πρόσθεσε τα env vars στο Vercel.
2. Push / deploy.
3. Κάνε login μία φορά στο `/login` (επιβεβαίωση ότι δουλεύει).
4. **Μετά** τρέξε το `db/phase2_lock.sql` στο Supabase SQL Editor (Phase 2 — κλείδωμα DB).
