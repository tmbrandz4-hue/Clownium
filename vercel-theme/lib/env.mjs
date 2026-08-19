import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';

const STRIP_PROLOGUE = new Set([
  'components/cart-page.njk',
  'components/product-page.njk',
  'components/feedback-page.njk',
  'components/status-page.njk',
]);

const PROLOGUE_RE = /^[\s\S]*?(<div class="(?:container component|product-wrapper component)[\s\S]*)$/;

class ThemeLoader extends nunjucks.FileSystemLoader {
  getSource(name) {
    const src = super.getSource(name);
    if (!src) return src;
    const rel = name.replace(/\\/g, '/');
    if (STRIP_PROLOGUE.has(rel)) {
      const m = src.src.match(PROLOGUE_RE);
      if (m) src.src = m[1];
    }
    return src;
  }
}

export function createThemeEnv({ themeDir, overridesDir, ctx }) {
  const env = new nunjucks.Environment(
    new ThemeLoader([overridesDir, themeDir], { noCache: true }),
    { autoescape: false, throwOnUndefined: false, trimBlocks: false, lstripBlocks: false }
  );

  env.addExtension('render_component', new RenderComponentExtension());
  env.addExtension('render_snippet', new RenderSnippetExtension());

  registerFilters(env, ctx);
  registerGlobals(env, ctx);

  return env;
}

class RenderComponentExtension {
  tags = ['render_component'];

  parse(parser, nodes, lexer) {
    const tok = parser.nextToken();
    const args = new nodes.NodeList(tok.lineno, tok.colno);
    args.addChild(parser.parseExpression());
    parser.advanceAfterBlockEnd(tok.value);
    return new nodes.CallExtensionAsync(this, 'run', args);
  }

  run(context, name, callback) {
    const g = context.lookup('global') || {};
    const components = context.lookup('components') || {};
    let type = name;
    let props = {};
    let id = name;

    if (typeof name === 'string' && g.components && Object.prototype.hasOwnProperty.call(g.components, name)) {
      type = name;
      props = g.components[name] || {};
      id = name;
    } else if (typeof name === 'string' && Object.prototype.hasOwnProperty.call(components, name)) {
      const c = components[name];
      type = c.type;
      props = c.properties || {};
      id = name;
    }

    const merged = { ...context.getVariables(), componentId: id, properties: props };
    context.env.render(`components/${type}.njk`, merged, (err, res) => callback(err, res));
  }
}

class RenderSnippetExtension {
  tags = ['render_snippet'];

  parse(parser, nodes, lexer) {
    const tok = parser.nextToken();
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);
    return new nodes.CallExtensionAsync(this, 'run', args);
  }

  run(context, filename, kwargs, callback) {
    if (typeof kwargs === 'function') {
      callback = kwargs;
      kwargs = {};
    }
    const merged = { ...context.getVariables(), ...(kwargs || {}) };
    context.env.render(`snippets/${filename}`, merged, (err, res) => callback(err, res));
  }
}

function registerFilters(env, ctx) {
  env.addFilter('assetUrl', (name) => `/assets/${name}`);

  env.addFilter('shopUrl', (pathname) => {
    if (typeof pathname !== 'string') return pathname;
    if (pathname.startsWith('/customer')) return `${ctx.shop.url}${pathname}`;
    return pathname;
  });

  env.addFilter('staticAsset', (name) => `https://static.sellauth.com/${name}`);

  env.addFilter('apiInternalUrl', (pathname) => `https://api-internal-3.sellauth.com/${pathname || ''}`);

  env.addFilter('themeColor', () => (ctx.global.properties && ctx.global.properties.theme_color) || '#6571FF');

  env.addFilter('hex_to_rgb', (hex) => {
    if (typeof hex !== 'string') return '0,0,0';
    let h = hex.replace(/^#/, '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length >= 6) h = h.slice(0, 6);
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return '0,0,0';
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  });

  env.addFilter('json', (value) => JSON.stringify(value));

  env.addFilter('t', (key) => {
    const map = ctx.translations || {};
    return map[key] || key;
  });

  env.addFilter('jsEscape', (value) =>
    String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\r?\n/g, '\\n')
  );

  env.addFilter('renderString', (value) => {
    if (typeof value !== 'string') return value;
    return env.renderString(value, ctx);
  });

  env.addFilter('formatDate', (value) => formatDate(value));
  env.addFilter('formatDateTime', (value) => formatDateTime(value));

  env.addFilter('imageUrl', (value) => (value && value.url ? value.url : value));

  env.addFilter('markup', (value) => value);

  env.addFilter('ytEmbedVideoId', (url) => {
    if (typeof url !== 'string') return '';
    const m = url.match(/(?:youtu\.be\/|v=|\/embed\/)([\w-]{6,})/);
    return m ? m[1] : '';
  });

  env.addFilter('ytEmbedLink', (url) => {
    if (typeof url !== 'string') return url;
    if (url.includes('/embed/')) return url;
    const id = url.match(/(?:youtu\.be\/|v=|\/embed\/)([\w-]{6,})/);
    return id ? `https://www.youtube-nocookie.com/embed/${id[1]}` : url;
  });
}

function registerGlobals(env, ctx) {
  env.addGlobal('formatPrice', (price, currency) => {
    const n = parseFloat(price);
    if (!Number.isFinite(n)) return '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || ctx.shop.currency || 'USD',
      }).format(n);
    } catch {
      return `${n.toFixed(2)} ${currency || ctx.shop.currency || 'USD'}`;
    }
  });

  env.addGlobal('helpers', {
    components: {
      products: {
        getItemsByIds: (items, ids) =>
          Array.isArray(ids) ? ids.map((id) => items.find((i) => String(i.id) === String(id))).filter(Boolean) : [],
      },
    },
  });
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}