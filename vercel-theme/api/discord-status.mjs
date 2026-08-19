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

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const raw = cookies.discord_link;
  if (!raw) return res.status(200).json({ linked: false, discord: null });

  try {
    const discord = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    return res.status(200).json({ linked: true, discord });
  } catch {
    return res.status(200).json({ linked: false, discord: null });
  }
}
