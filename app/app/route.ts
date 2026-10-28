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

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>REDIE 969 - Κατέβασε την Εφαρμογή</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#050508;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center}
.glow{position:fixed;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(255,45,45,0.3) 0%,transparent 70%);filter:blur(100px);z-index:0}
h1{font-size:56px;font-weight:900;letter-spacing:-1px;margin-bottom:8px;position:relative;z-index:1}
h1 span{color:#FF2D2D}
.tag{color:#999;font-size:18px;margin-bottom:48px;position:relative;z-index:1}
.btns{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;position:relative;z-index:1}
.btn{display:inline-flex;align-items:center;gap:12px;padding:18px 32px;border-radius:14px;text-decoration:none;color:#fff;font-weight:600;font-size:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);transition:all .25s;min-width:220px;justify-content:center}
.btn:hover{border-color:#FF2D2D;background:rgba(255,45,45,0.1);transform:translateY(-2px)}
.btn.primary{background:#FF2D2D;border-color:#FF2D2D}
.btn.primary:hover{background:#E62020}
</style>
</head>
<body>
<div class="glow"></div>
<h1>REDIE <span>969</span></h1>
<p class="tag">Κατέβασε την εφαρμογή</p>
<div class="btns">
<a href="${IOS_URL}" class="btn">🍎 App Store</a>
<a href="${ANDROID_URL}" class="btn primary">▶ Google Play</a>
</div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
