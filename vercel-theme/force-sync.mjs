import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const { default: SellAuthAPI } = await import(
  pathToFileURL('C:/Users/Brian Fidelio/AppData/Roaming/npm/node_modules/sellauth-theme-cli/lib/sellauth-api.js')
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const api = new SellAuthAPI({ apiKey: '6053187|LeTaiCfw1KcRJPK1ff8ij06lh5ChpqYj5mfRdHu4ff62da4d' });

const themeId = process.argv[2] || '270873';
const localRoot = path.resolve(__dirname, 'themes', themeId);

const files = [];
(function walk(d, rel = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(d, e.name), r);
    else files.push(r);
  }
})(localRoot);

let updated = 0;
for (const rel of files) {
  const full = path.join(localRoot, rel.split('/').join(path.sep));
  const folder = rel.includes('/') ? path.dirname(rel) : 'root';
  const name = path.basename(rel);

  if (name.toLowerCase().endsWith('.ttf')) {
    try { await api.deleteFile(themeId, folder, name); } catch {}
    const res = await api.uploadFile(themeId, folder, full);
    console.log(`binary ${rel}: ${res.filename}`);
  } else {
    const content = fs.readFileSync(full, 'utf8');
    await api.updateFile(themeId, folder, name, content);
  }
  updated++;
}
console.log(`force-synced ${updated} files to theme ${themeId}`);
process.exit(0);