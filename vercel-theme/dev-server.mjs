import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, 'dist');
const PORT = process.env.PORT || 8137;

let API_KEY = process.env.SELLAUTH_API_KEY;
if (!API_KEY) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.local.json'), 'utf8'));
    API_KEY = cfg.apiKey;
  } catch {}
}
const SHOP = process.env.SELLAUTH_SHOP_ID || '261900';
const THEME = '270873';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

async function getChallenge() {
  const tokRes = await fetch('https://api-internal-3.sellauth.com/v1/shops/' + SHOP + '/builder/' + THEME + '/generate-token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Authorization': 'Bearer ' + API_KEY }
  });
  const tokData = await tokRes.json();
  if (!tokData.token) throw new Error('token failed: ' + JSON.stringify(tokData));
  const htmlRes = await fetch('https://sellauth.com/builder/render/' + SHOP + '/' + THEME + '/' + tokData.token + '/shop', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await htmlRes.text();
  const i = html.indexOf('challengejson=');
  if (i < 0) throw new Error('no challenge in render');
  const a = html.indexOf("'", i + 14);
  const b = html.indexOf("'", a + 1);
  return JSON.parse(html.slice(a + 1, b));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const urlPath = decodeURIComponent(url.pathname);

  if (urlPath === '/api/altcha' && req.method === 'GET') {
    try {
      if (!API_KEY) throw new Error('no API key (set SELLAUTH_API_KEY or config.local.json)');
      const challenge = await getChallenge();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ challenge }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // Redirect /account → /customer/dashboard (mirrors vercel.json)
  if (urlPath === '/account') {
    res.writeHead(308, { Location: '/customer/dashboard' });
    res.end();
    return;
  }

  // /customer/dashboard, /customer/invoices, /customer/tickets, /customer/balance → serve their static files
  if (urlPath === '/customer/dashboard' || urlPath === '/customer/dashboard/') {
    const f = path.join(ROOT, 'customer/dashboard/index.html');
    if (fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(f)); }
    else { res.writeHead(404); res.end('run node build.mjs first'); }
    return;
  }
  if (urlPath === '/customer/invoices' || urlPath === '/customer/invoices/') {
    const f = path.join(ROOT, 'customer/invoices/index.html');
    if (fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(f)); }
    else { res.writeHead(302, { Location: '/customer/dashboard' }); res.end(); }
    return;
  }
  if (urlPath.startsWith('/customer/tickets')) {
    const f = path.join(ROOT, 'customer/tickets/index.html');
    if (fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(f)); }
    else { res.writeHead(302, { Location: '/customer/dashboard' }); res.end(); }
    return;
  }
  if (urlPath === '/customer/balance' || urlPath === '/customer/balance/') {
    const f = path.join(ROOT, 'customer/balance/index.html');
    if (fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(f)); }
    else { res.writeHead(302, { Location: '/customer/dashboard' }); res.end(); }
    return;
  }

  if (urlPath === '/api/discord-login' && req.method === 'GET') {
    if (!DISCORD_CLIENT_ID) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Missing DISCORD_CLIENT_ID');
      return;
    }
    const state = crypto.randomBytes(18).toString('hex');
    const next = (url.searchParams.get('next') || '/customer/dashboard');
    const redirectUri = 'http://localhost:' + PORT + '/api/discord-callback';
    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.set('client_id', DISCORD_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'identify email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');
    res.writeHead(302, {
      'Set-Cookie': [
        'discord_oauth_state=' + encodeURIComponent(state) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=600',
        'discord_oauth_next=' + encodeURIComponent(next) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=600'
      ],
      Location: authUrl.toString()
    });
    res.end();
    return;
  }

  if (urlPath === '/api/discord-callback' && req.method === 'GET') {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Missing Discord OAuth env vars');
      return;
    }
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
      const i = s.indexOf('=');
      return i === -1 ? [s, ''] : [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
    }));
    const state = url.searchParams.get('state') || '';
    const code = url.searchParams.get('code') || '';
    const next = cookies.discord_oauth_next && cookies.discord_oauth_next.startsWith('/') ? cookies.discord_oauth_next : '/customer/dashboard';
    if (!state || !code || state !== cookies.discord_oauth_state) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid Discord OAuth state');
      return;
    }
    try {
      const redirectUri = 'http://localhost:' + PORT + '/api/discord-callback';
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) throw new Error('Discord token exchange failed');
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: 'Bearer ' + tokenData.access_token },
      });
      const user = await userRes.json();
      if (!userRes.ok || !user.id) throw new Error('Discord user fetch failed');
      const payload = Buffer.from(JSON.stringify({
        id: user.id,
        username: user.username,
        global_name: user.global_name || '',
        email: user.email || '',
        avatar: user.avatar || '',
      }), 'utf8').toString('base64url');
      res.writeHead(302, {
        'Set-Cookie': [
          'discord_link=' + payload + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000',
          'discord_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
          'discord_oauth_next=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
        ],
        Location: next + (next.includes('?') ? '&' : '?') + 'discord=linked'
      });
      res.end();
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(String(e));
    }
    return;
  }

  if (urlPath === '/api/discord-status' && req.method === 'GET') {
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
      const i = s.indexOf('=');
      return i === -1 ? [s, ''] : [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
    }));
    const raw = cookies.discord_link;
    if (!raw) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ linked: false, discord: null }));
      return;
    }
    try {
      const discord = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ linked: true, discord }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ linked: false, discord: null }));
    }
    return;
  }

  if (urlPath === '/api/discord-logout' && req.method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'discord_link=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Proxy /api/customer → api-internal-3.sellauth.com/v1/customer-dashboard/
  if (urlPath === '/api/customer') {
    const pathParam = (url.searchParams.get('path') || '').replace(/^\/+/, '');
    if (!pathParam) { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing path param' })); return; }

    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }

    const upstream = new URL('https://api-internal-3.sellauth.com/v1/customer-dashboard/' + pathParam);
    url.searchParams.forEach((v, k) => { if (k !== 'path') upstream.searchParams.set(k, v); });

    try {
      let body = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        body = await new Promise((ok, fail) => { let s = ''; req.on('data', c => s += c); req.on('end', () => ok(s)); req.on('error', fail); });
      }
      const r = await fetch(upstream.toString(), {
        method: req.method === 'DELETE' ? 'DELETE' : req.method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': authHeader },
        ...(body !== undefined ? { body } : {}),
      });
      const data = await r.json().catch(() => ({}));
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  let file = path.join(ROOT, urlPath);
  if (urlPath.endsWith('/')) file = path.join(file, 'index.html');
  if (!path.extname(file) && fs.existsSync(file + '.html')) file = file + '.html';
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}).listen(PORT, () => {
  console.log('Clownium static test server:');
  console.log('  http://localhost:' + PORT);
  console.log('  /api/altcha   -> ' + (API_KEY ? 'live (config.local.json)' : 'NO API KEY, will 500'));
  console.log('  /api/customer -> proxied to api-internal-3.sellauth.com');
  console.log('');
  console.log('Test login flow:');
  console.log('  1. Go to http://localhost:' + PORT + '/customer/dashboard');
  console.log('  2. Click "Sign in with email"');
  console.log('  3. Enter a REAL email, click "I\'m not a robot", click Continue');
  console.log('  4. Enter the 6-digit code -> dashboard appears');
  console.log('  Test Dashboard / Orders / Tickets tabs');
});