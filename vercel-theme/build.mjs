import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAll } from './lib/sellauth.mjs';
import { createThemeEnv } from './lib/env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const THEME_DIR = path.resolve(ROOT, '../theme-270335');
const OVERRIDES_DIR = path.join(ROOT, 'overrides');
const OUT_DIR = path.join(ROOT, 'dist');

const CURRENCY_RATES = {
  eur: 0.860506, usd: 0.999994, gbp: 0.748919, aed: 3.67, amd: 380.83,
  ars: 1415.11, aud: 1.54, bam: 1.68, bdt: 121.23, bhd: 0.375326,
  bmd: 0.999994, brl: 5.52, cad: 1.4, chf: 0.799471, clp: 954.86,
  cny: 7.12, cop: 3868.96, crc: 500.49, czk: 20.93, dkk: 6.42,
  dop: 62.77, gel: 2.71, gtq: 7.63, hkd: 7.78, hnl: 26.14,
  huf: 338.1, idr: 16604.5, ils: 3.27, inr: 88.76, jpy: 151.19,
  kes: 128.72, krw: 1429.54, kwd: 0.305086, lbp: 89251, lkr: 301.28,
  mmk: 2099.49, mxn: 18.59, myr: 4.22, ngn: 1462.68, nok: 10.12,
  nzd: 1.75, pen: 3.41, php: 58.32, pkr: 281.94, pln: 3.66,
  ron: 4.384674, rub: 81.27, sar: 3.75, sek: 9.51, sgd: 1.3,
  svc: 8.71, thb: 32.67, try: 41.85, twd: 30.72, uah: 41.46,
  vef: 0.100129, vnd: 26340, xag: 0.01996815, xau: 0.00024893,
  xdr: 0.70179, zar: 17.5, zmw: 22.52, btc: 0.00000892, ltc: 0.01034178,
};

const LEGAL_TERMS = null;
const LEGAL_PRIVACY = null;
const LEGAL_REFUND = null;

function readSettings() {
  return JSON.parse(fs.readFileSync(path.join(THEME_DIR, 'settings.json'), 'utf8'));
}

function legalPage(title, html) {
  return `<h2>${title}</h2>${html}`;
}

function legalStrings(shopName) {
  return {
    terms_of_service: legalPage(
      'Terms of Service',
      `<p>By purchasing from ${shopName} you agree to the following terms. All sales are final unless otherwise stated. Products are delivered instantly after payment confirmation. Reselling or redistributing purchased products is strictly prohibited and may result in loss of access without refund.</p><p>We reserve the right to update these terms at any time.</p>`
    ),
    privacy_policy: legalPage(
      'Privacy Policy',
      `<p>We collect the minimum information required to process your order and deliver your product. Your payment is processed securely by our payment provider. We do not sell your personal data to third parties.</p>`
    ),
    refund_policy: legalPage(
      'Refund Policy',
      `<p>Because our products are delivered instantly and can be copied, all purchases are final and non-refundable unless the product is defective or fails to function as described. Contact support for assistance with any issues.</p>`
    ),
  };
}

const SYNTH_TEMPLATES = {
  products: {
    layout: 'master',
    components: { 'products-page': { type: 'products-page', properties: { default_title: 'Products' } } },
    components_order: ['products-page'],
  },
  account: {
    layout: 'master',
    components: {},
    components_order: [],
  },
};

function renderAsync(env, name, ctx) {
  return new Promise((resolve, reject) => {
    env.render(name, ctx, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

async function main() {
  const data = await fetchAll();
  const settings = readSettings();
  const legal = legalStrings(data.shop.name);

  console.log(`shop=${data.shop.name} products=${data.products.length} feedbacks=${data.feedbacks.length} blog=${data.blogPosts.data.length}`);

  const baseCtx = {
    global: settings.global,
    settings,
    shop: data.shop,
    products: data.products,
    sortedItems: data.products,
    categories: data.categories,
    category_links: data.category_links,
    feedbacks: data.feedbacks,
    feedbacksPaginator: data.feedbacksPaginator,
    blogPosts: data.blogPosts,
    shop_customer: null,
    isBuilder: false,
    is_embed: false,
    altcha: false,
    altcha_shop_customer: false,
    schemaOrg: null,
    analytics_script_url: null,
    analytics_website_id: null,
    footer_scripts: null,
    currency: data.shop.currency,
    currency_rates_usd: CURRENCY_RATES,
    translations: {},
    category: null,
    category_links: [],
    filters: { keyword: '', price: { from: '', to: '' } },
    items: data.products,
    items_paginator: { ...data.feedbacksPaginator, last_page: 1, page: 1 },
    liveStats: {},
    salesCountHoursLabelMap: {},
    productAddons: [],
    productUpsells: [],
    name: null,
  };

  const env = createThemeEnv({
    themeDir: THEME_DIR,
    overridesDir: OVERRIDES_DIR,
    ctx: baseCtx,
  });

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = [
    { name: 'shop', out: 'index.html', extra: {} },
    { name: 'products', out: 'products/index.html', extra: {} },
    { name: 'cart', out: 'cart/index.html', extra: {} },
    { name: 'feedback', out: 'feedback/index.html', extra: {} },
    { name: 'status', out: 'status/index.html', extra: {} },
    { name: 'faq', out: 'faq/index.html', extra: {} },
    { name: 'terms', out: 'terms-of-service/index.html', extra: { terms_of_service: legal.terms_of_service } },
    { name: 'privacy-policy', out: 'privacy-policy/index.html', extra: { privacy_policy: legal.privacy_policy } },
    { name: 'refund-policy', out: 'refund-policy/index.html', extra: { refund_policy: legal.refund_policy } },
    { name: 'blog', out: 'blog/index.html', extra: {} },
    { name: 'account', out: 'customer/dashboard/index.html', extra: {} },
    { name: 'account', out: 'customer/invoices/index.html', extra: {} },
    { name: 'account', out: 'customer/tickets/index.html', extra: {} },
    { name: 'customer-balance', out: 'customer/balance/index.html', extra: {} },
  ];

  const productPages = data.products
    .filter((p) => p.type !== 'group')
    .map((p) => ({ name: 'product', out: `product/${p.path}/index.html`, extra: { product: p } }));

  for (const page of [...pages, ...productPages]) {
    const tpl = settings.templates[page.name] || SYNTH_TEMPLATES[page.name];
    const ctx = {
      ...baseCtx,
      templateName: page.name,
      components: tpl.components,
      components_order: tpl.components_order,
      ...page.extra,
    };

    const childHtml = await renderAsync(env, `templates/${page.name}.njk`, ctx);
    const pageHtml = await renderAsync(env, `layouts/${tpl.layout || 'master'}.njk`, {
      ...ctx,
      templateContent: childHtml,
    });

    const outFile = path.join(OUT_DIR, page.out);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, pageHtml);
    console.log(`rendered ${page.out}`);
  }

  // 404 page (redirect-friendly placeholder)
  const shopTpl = settings.templates.shop;
  const shopCtx = {
    ...baseCtx,
    templateName: 'shop',
    components: shopTpl.components,
    components_order: shopTpl.components_order,
  };
  const shopChild = await renderAsync(env, 'templates/shop.njk', shopCtx);
  const shopHtml = await renderAsync(env, 'layouts/master.njk', {
    ...shopCtx,
    templateContent: `<div class="container component" style="padding-top:120px;padding-bottom:120px;text-align:center"><h1>404</h1><p>Page not found.</p><p><a class="btn btn-primary" href="/">Go Home</a></p></div>`,
  });
  fs.writeFileSync(path.join(OUT_DIR, '404.html'), shopHtml);

  // Copy theme assets
  const assetsSrc = path.join(THEME_DIR, 'assets');
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, path.join(OUT_DIR, 'assets'), { recursive: true });
    console.log('copied assets');
  }

  console.log('build complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});