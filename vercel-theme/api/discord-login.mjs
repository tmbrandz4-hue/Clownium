const AUTH_BASE = 'https://discord.com/api/oauth2/authorize';

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function randomState() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export default async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return res.status(500).send('Missing DISCORD_CLIENT_ID');

  const base = getBaseUrl(req);
  const redirectUri = `${base}/api/discord-callback`;
  const state = randomState();
  const next = typeof req.query?.next === 'string' && req.query.next.startsWith('/') ? req.query.next : '/customer/dashboard';

  res.setHeader('Set-Cookie', [
    `discord_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    `discord_oauth_next=${encodeURIComponent(next)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  ]);

  const url = new URL(AUTH_BASE);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'identify email');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'consent');

  res.writeHead(302, { Location: url.toString() });
  res.end();
}
