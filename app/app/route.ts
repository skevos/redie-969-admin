import { NextRequest, NextResponse } from 'next/server';

const IOS_URL = 'https://apps.apple.com/us/app/redie969/id6758665312';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=gr.redie969.redie_969_app&utm_medium=qr';

export function GET(request: NextRequest) {
  const ua = request.headers.get('user-agent') || '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return NextResponse.redirect(IOS_URL, { status: 302 });
  }
  if (/Android/i.test(ua)) {
    return NextResponse.redirect(ANDROID_URL, { status: 302 });
  }
  return new NextResponse(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>REDIE 969</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px}h1{font-size:44px;font-weight:800;margin-bottom:8px}h1 span{color:#E53935}.tag{color:#888;font-size:17px;margin-bottom:40px}.btns{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}.btn{display:flex;align-items:center;gap:12px;padding:16px 28px;border-radius:16px;text-decoration:none;color:#fff;font-weight:600;border:1px solid #333;background:#141414;min-width:220px}.btn:hover{border-color:#E53935}</style></head>
<body><h1>REDIE <span>969</span></h1><p class="tag">Κατέβασε την εφαρμογή</p>
<div class="btns">
<a href="${IOS_URL}" class="btn">🍎 App Store</a>
<a href="${ANDROID_URL}" class="btn">🤖 Google Play</a>
</div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
