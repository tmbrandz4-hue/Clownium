const HOOK_URL = process.env.DEPLOY_HOOK_URL;

export default async function handler(req, res) {
  if (!HOOK_URL) {
    return res.status(500).json({ error: 'DEPLOY_HOOK_URL env var not set' });
  }
  try {
    const r = await fetch(HOOK_URL, { method: 'POST' });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: r.ok, status: r.status });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}