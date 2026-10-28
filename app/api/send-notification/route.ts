import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, getSessionSecret, safeEqual, verifySessionToken } from '../../lib/session';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Defensive auth (the proxy also enforces this): admin cookie or internal secret header.
  const secret = getSessionSecret();
  if (secret) {
    const session = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
    const internalOk = safeEqual(request.headers.get('x-internal-secret'), secret);
    if (!(session && session.kind === 'admin') && !internalOk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  try {
    const { title, body, token, tokens } = await request.json();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'Firebase config missing' }, { status: 500 });
    }

    const jwt = await createJWT(clientEmail, privateKey);
    const accessToken = await getAccessToken(jwt);
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to obtain FCM access token' }, { status: 500 });
    }

    const tokenList = tokens || (token ? [token] : []);
    const results: any[] = [];
    const invalidTokens: string[] = [];
    const seenTokens = new Set();

    for (const t of tokenList) {
      if (seenTokens.has(t)) continue;
      seenTokens.add(t);

      try {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: t,
                notification: { title, body },
                android: {
                  priority: 'high',
                  notification: {
                    sound: 'default',
                    channelId: 'redie969_notifications'
                  }
                },
                apns: {
                  payload: {
                    aps: {
                      alert: { title, body },
                      sound: 'default',
                      badge: 1,
                      'content-available': 1
                    }
                  },
                  headers: {
                    'apns-priority': '10'
                  }
                }
              },
            }),
          }
        );

        const result = await response.json();
        if (!response.ok && isInvalidTokenError(result)) invalidTokens.push(t);
        results.push({ token: t.substring(0, 20) + '...', success: response.ok, result });
      } catch (e) {
        results.push({ token: t.substring(0, 20) + '...', success: false, error: String(e) });
      }
    }

    return NextResponse.json({ 
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: results.length,
      invalidTokens,
      results 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

function isInvalidTokenError(result: any) {
  const err = result?.error;
  if (!err) return false;
  if (err.status === 'NOT_FOUND') return true;
  const details = Array.isArray(err.details) ? err.details : [];
  if (details.some((d: any) => d?.errorCode === 'UNREGISTERED')) return true;
  // INVALID_ARGUMENT can also mean a bad payload; only treat it as a dead token when the message is about the token
  const isInvalidArg = err.status === 'INVALID_ARGUMENT' || details.some((d: any) => d?.errorCode === 'INVALID_ARGUMENT');
  return isInvalidArg && /registration token|token/i.test(String(err.message || ''));
}

function base64url(str: string) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createJWT(clientEmail: string, privateKey: string) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${signatureInput}.${signatureB64}`;
}

function pemToArrayBuffer(pem: string) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(jwt: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });
  const data = await response.json().catch(() => null);
  return data?.access_token as string | undefined;
}
