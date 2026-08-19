/**
 * /api/customer — proxies SellAuth customer-dashboard API calls.
 *
 * The browser sends its shop_customer_token as a Bearer token.
 * We forward the request to api-internal-3 and relay the response.
 *
 * Supported routes (all authenticated):
 *   GET  /api/customer?path=dashboard
 *   GET  /api/customer?path=invoices[&page=N]
 *   GET  /api/customer?path=tickets[&page=N]
 *   GET  /api/customer?path=tickets/:id
 *   POST /api/customer?path=tickets/:id/messages   body: {content}
 *   POST /api/customer?path=logout
 *   DELETE /api/customer?path=account
 */

const API_BASE = 'https://api-internal-3.sellauth.com/v1/customer-dashboard/';

export default async function handler(req, res) {
  // Allow cross-origin requests from same origin / Vercel preview URLs
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Parse the path param: e.g. "invoices", "tickets/42", "tickets/42/messages"
  const url = new URL(req.url, 'http://x');
  const pathParam = (url.searchParams.get('path') || '').replace(/^\/+/, '');
  if (!pathParam) {
    return res.status(400).json({ error: 'Missing path param' });
  }

  // Build upstream URL with forwarded query params (page, etc.)
  const upstream = new URL(API_BASE + pathParam);
  url.searchParams.forEach((v, k) => {
    if (k !== 'path') upstream.searchParams.set(k, v);
  });

  try {
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method)
      ? await readBody(req)
      : undefined;

    const r = await fetch(upstream.toString(), {
      method: req.method === 'DELETE' ? 'DELETE' : req.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      ...(body !== undefined ? { body } : {}),
    });

    const data = await r.json().catch(() => ({}));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => resolve(s));
    req.on('error', reject);
  });
}
