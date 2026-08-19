import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAll } from './lib/sellauth.mjs';
import { createThemeEnv } from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE = path.resolve(__dirname, '../theme-clownium');

const render = (env, name, ctx) => new Promise((res, rej) => env.render(name, ctx, (e, o) => (e ? rej(e) : res(o))));

const data = await fetchAll();
const settings = JSON.parse(fs.readFileSync(path.join(PACKAGE, 'settings.json'), 'utf8'));

const baseCtx = {
  global: settings.global, settings, shop: data.shop,
  products: data.products, sortedItems: data.products, categories: data.categories,
  category_links: data.category_links, feedbacks: data.feedbacks, blogPosts: data.blogPosts,
  shop_customer: null, isBuilder: false, is_embed: false,
  altcha: false, altcha_shop_customer: false,
  analytics_script_url: null, analytics_website_id: null, footer_scripts: null,
  currency: data.shop.currency, currency_rates_usd: {},
  translations: {}, category: null, filters: { keyword: '', price: {} },
  items: data.products, items_paginator: { last_page: 1, page: 1 },
  liveStats: {}, salesCountHoursLabelMap: {}, productAddons: [], productUpsells: [], name: null,
};

const env = createThemeEnv({ themeDir: PACKAGE, overridesDir: PACKAGE, ctx: baseCtx });

const checks = [];
for (const tpl of ['shop', 'products', 'cart', 'product', 'faq', 'terms', 'blog']) {
  const cfg = settings.templates[tpl];
  if (!cfg) { checks.push(`${tpl}: NO SETTINGS ENTRY`); continue; }
  const extra = tpl === 'product' ? { product: data.products.find((p) => p.type !== 'group') } : {};
  const ctx = { ...baseCtx, templateName: tpl, components: cfg.components, components_order: cfg.components_order, ...extra };
  try {
    const child = await render(env, `templates/${tpl}.njk`, ctx);
    const page = await render(env, `layouts/${cfg.layout || 'master'}.njk`, { ...ctx, templateContent: child });
    const name = tpl === 'product' ? 'product(aimbetter-external)' : tpl;
    checks.push(`${name}: OK ${page.length}b`);
  } catch (e) {
    checks.push(`${tpl}: ERROR ${e.message.split('\n')[0]}`);
  }
}
console.log(checks.join('\n'));
process.exit(0);