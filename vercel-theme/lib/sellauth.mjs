import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const API_KEY = process.env.SELLAUTH_API_KEY;
const SHOP_ID = process.env.SELLAUTH_SHOP_ID || '261900';
const BASE = process.env.SELLAUTH_API_BASE || 'https://api.sellauth.com/v1';

if (!API_KEY) {
  const local = path.join(ROOT, 'config.local.json');
  if (fs.existsSync(local)) {
    const cfg = JSON.parse(fs.readFileSync(local, 'utf8'));
    process.env.SELLAUTH_API_KEY = cfg.apiKey;
  }
}

const finalKey = process.env.SELLAUTH_API_KEY;
if (!finalKey) {
  console.error('SELLAUTH_API_KEY not set. Add it as an env var or to config.local.json');
  process.exit(1);
}

async function api(pathname) {
  const url = `${BASE}${pathname}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${finalKey}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

export async function fetchAll() {
  const shop = await api(`/shops/${SHOP_ID}`);
  const productsPage = await api(`/shops/${SHOP_ID}/products`);
  const feedbacksPage = await api(`/shops/${SHOP_ID}/feedbacks`);
  const blogPage = await api(`/shops/${SHOP_ID}/blog-posts`);
  const categoriesPage = await api(`/shops/${SHOP_ID}/categories`);

  const products = [];
  for (const p of productsPage.data || []) {
    const detail = await api(`/shops/${SHOP_ID}/products/${p.id}`);
    products.push(enrichProduct(detail));
  }
  products.sort((a, b) => a.id - b.id);

  const categories = (categoriesPage.data || []).map((c) => enrichCategory(c));
  const categoryLinks = categories.map((c) => ({
    id: c.id,
    name: c.name,
    depth: c.parent_id ? 1 : 0,
    url: `/products?category=${c.id}`,
  }));

  return {
    shop: enrichShop(shop),
    products,
    categories,
    category_links: categoryLinks,
    feedbacks: feedbacksPage.data || [],
    feedbacksPaginator: paginator(feedbacksPage),
    blogPosts: { ...(blogPage || {}), data: blogPage.data || [] },
  };
}

function enrichCategory(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug || null,
    description: c.description || null,
    image_url: c.image_url || null,
    parent_id: c.parent_id || null,
  };
}

function paginator(page) {
  return {
    page: page.current_page || 1,
    last_page: page.last_page || 1,
    has_previous: page.current_page > 1,
    has_next: page.current_page < (page.last_page || 1),
    previous_page_number: (page.current_page || 1) - 1,
    next_page_number: (page.current_page || 1) + 1,
    num_items: page.total || 0,
    per_page: page.per_page || 0,
  };
}

function enrichShop(s) {
  const logo = s.logo_image_url || (s.logo_image_id ? `https://api.sellauth.com/storage/images/${s.logo_image_id}.webp` : null);
  return {
    ...s,
    url: s.url || `https://${s.subdomain}.mysellauth.com`,
    image_url: logo,
    favicon_url: s.favicon_image_url || (s.favicon_image_id ? `https://api.sellauth.com/storage/images/${s.favicon_image_id}.webp` : logo),
    background_image_url: s.background_image_url || null,
    discord_url: s.discord_url || null,
    max_cart_limit: s.cart_item_limit || 3,
    total_customers: s.total_customers || 0,
    products_sold: s.products_sold || 0,
    average_rating: s.average_rating || '0.00',
    currency: s.currency || 'USD',
  };
}

function enrichProduct(p) {
  const variants = (p.variants || []).map((v) => ({
    ...v,
    price: typeof v.price === 'string' ? parseFloat(v.price) : v.price,
    price_slash: v.price_slash != null ? parseFloat(v.price_slash) : null,
    quantity_min: v.quantity_min ?? null,
    quantity_max: v.quantity_max ?? null,
    stock: v.stock ?? -1,
    volume_discounts: v.volume_discounts || null,
  }));

  const prices = variants.map((v) => v.price).filter((n) => Number.isFinite(n));
  const slashes = variants.map((v) => v.price_slash).filter((n) => Number.isFinite(n));

  const imageUrls = (p.images || []).map((i) => i.url || i).filter(Boolean);
  const stock = p.type === 'variant'
    ? (p.stock_count ?? variants.reduce((a, v) => a + (v.stock > 0 ? v.stock : 0), 0))
    : (p.stock_count ?? -1);

  return {
    ...p,
    id: p.id,
    path: p.path,
    name: p.name,
    description: p.description || '',
    currency: p.currency || 'USD',
    visibility: p.visibility || 'public',
    type: p.type || 'variant',
    group_id: p.group_id || null,
    is_group: (p.type || 'variant') === 'group',
    images: p.images || [],
    image_urls: imageUrls,
    image_url: imageUrls[0] || null,
    meta_title: p.meta_title || p.name,
    meta_description: p.meta_description || `${p.name} — buy now at ${p.shop ? p.shop.name : 'our store'}.`,
    meta_image_url: p.meta_image_url || imageUrls[0] || null,
    meta_twitter_card: p.meta_twitter_card || 'summary',
    min_price: prices.length ? Math.min(...prices) : null,
    max_price: prices.length ? Math.max(...prices) : null,
    min_price_slash: slashes.length ? Math.min(...slashes) : null,
    stock,
    products_sold: p.products_sold ?? null,
    sales_count_hours: p.sales_count_hours ?? null,
    quantity_min: p.quantity_min ?? 1,
    quantity_max: p.quantity_max ?? null,
    hide_stock_count: !!p.hide_stock_count,
    status_color: p.status_color || '#22c55e',
    status_text: p.status_text || 'Operational',
    product_badges: p.product_badges && p.product_badges.page
      ? p.product_badges
      : { card: [], page: [] },
    product_tabs: Array.isArray(p.product_tabs) ? p.product_tabs : [],
    variants,
  };
}