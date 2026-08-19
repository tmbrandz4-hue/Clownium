import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THEME_DIR = path.join(ROOT, 'theme-270335');
const OVERRIDES_DIR = path.join(__dirname, 'overrides');
const OUT_DIR = path.join(ROOT, 'theme-clownium');

const EXCLUDE_ASSETS = ['new-project.png', 'app.js', 'svc.css', 'hero.jpg'];

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

function copyDir(src, dst, exclusions = []) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclusions.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d, exclusions);
    else fs.copyFileSync(s, d);
  }
}

copyDir(THEME_DIR, OUT_DIR, EXCLUDE_ASSETS);

// Overlay overrides (same relative paths)
for (const dir of ['layouts', 'templates', 'components', 'snippets']) {
  const srcDir = path.join(OVERRIDES_DIR, dir);
  if (!fs.existsSync(srcDir)) continue;
  for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, file), path.join(OUT_DIR, dir, file));
  }
}

// Register products-page component in schema.json
const schemaPath = path.join(OUT_DIR, 'schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
schema.components['products-page'] = {
  label: 'Products Page',
  multiple: false,
  properties: {
    default_title: { label: 'Default Title', type: 'text', default: 'Products' },
    category_title: { label: 'Category Title', type: 'text' },
  },
};
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

// Ensure the products template uses the products-page component
const productsTemplate = {
  layout: 'master',
  components: {
    'products-page': {
      type: 'products-page',
      properties: { default_title: 'Products' },
    },
  },
  components_order: ['products-page'],
};

for (const settingsFile of ['settings.json', 'settings.default.json']) {
  const p = path.join(OUT_DIR, settingsFile);
  const settings = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!settings.templates) settings.templates = {};
  settings.templates.products = productsTemplate;
  fs.writeFileSync(p, JSON.stringify(settings, null, 2));
}

// Report
const files = [];
(function walk(d, rel = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) walk(path.join(d, e.name), r);
    else files.push(r);
  }
})(OUT_DIR);
console.log(`theme-clownium created: ${files.length} files`);
console.log('overlaid overrides:', JSON.stringify(fs.readdirSync(path.join(OVERRIDES_DIR, 'components'))));
console.log('products-page in schema:', !!schema.components['products-page']);
console.log('products template in settings:', !!JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'settings.json'), 'utf8')).templates.products);
console.log('new-project.png excluded:', !fs.existsSync(path.join(OUT_DIR, 'assets', 'new-project.png')));