export default async function handler(req, res) {
  const secret = process.env.REDEPLOY_SECRET || '';
  const provided = typeof req.query?.secret === 'string' ? req.query.secret : '';
  const hook = process.env.DEPLOY_HOOK_URL || '';

  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!hook) {
    return res.status(500).json({ error: 'Missing DEPLOY_HOOK_URL' });
  }

  try {
    const r = await fetch(hook, { method: 'POST' });
    const text = await r.text();
    return res.status(r.ok ? 200 : 500).json({ success: r.ok, status: r.status, body: text.slice(0, 2000) });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
