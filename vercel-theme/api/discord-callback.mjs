function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).send('Missing Discord OAuth env vars');

  const cookies = parseCookies(req);
  const state = typeof req.query?.state === 'string' ? req.query.state : '';
  const code = typeof req.query?.code === 'string' ? req.query.code : '';
  const next = cookies.discord_oauth_next && cookies.discord_oauth_next.startsWith('/') ? cookies.discord_oauth_next : '/customer/dashboard';

  if (!code || !state || state !== cookies.discord_oauth_state) {
    return res.status(400).send('Invalid Discord OAuth state');
  }

  const base = getBaseUrl(req);
  const redirectUri = `${base}/api/discord-callback`;

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    return res.status(500).send('Discord token exchange failed');
  }

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json();
  if (!userRes.ok || !user.id) {
    return res.status(500).send('Discord user fetch failed');
  }

  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    username: user.username,
    global_name: user.global_name || '',
    email: user.email || '',
    avatar: user.avatar || '',
  }), 'utf8').toString('base64url');

  res.setHeader('Set-Cookie', [
    `discord_link=${payload}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    'discord_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    'discord_oauth_next=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  ]);

  res.writeHead(302, { Location: `${next}${next.includes('?') ? '&' : '?'}discord=linked` });
  res.end();
}
