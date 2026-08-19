const API_KEY = process.env.SELLAUTH_API_KEY;
const SHOP = '261900';
const THEME = '270873';
const API_BASE = 'https://api-internal-3.sellauth.com/';
const RENDER_BASE = 'https://sellauth.com/builder/render';

export default async function handler(req, res) {
  if (!API_KEY) {
    return res.status(500).json({ error: 'SELLAUTH_API_KEY env var not set' });
  }
  try {
    const tokRes = await fetch(`${API_BASE}v1/shops/${SHOP}/builder/${THEME}/generate-token`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${API_KEY}` }
    });
    const tokData = await tokRes.json();
    if (!tokData.token) {
      return res.status(502).json({ error: 'token failed' });
    }
    const htmlRes = await fetch(`${RENDER_BASE}/${SHOP}/${THEME}/${tokData.token}/shop`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await htmlRes.text();
    const i = html.indexOf('challengejson=');
    if (i < 0) {
      return res.status(502).json({ error: 'no challenge in render' });
    }
    const a = html.indexOf("'", i + 14);
    const b = html.indexOf("'", a + 1);
    const challenge = JSON.parse(html.slice(a + 1, b));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ challenge });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}