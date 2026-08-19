import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';

const { default: SellAuthAPI } = await import(
  pathToFileURL('C:/Users/Brian Fidelio/AppData/Roaming/npm/node_modules/sellauth-theme-cli/lib/sellauth-api.js')
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.local.json'), 'utf8'));
const api = new SellAuthAPI({ apiKey: cfg.apiKey });

const localRoot = path.resolve(__dirname, 'themes/270873');

const remoteFiles = [];
const files = await api.getFiles('270873');
for (const folder of files.folders) {
  for (const f of folder.files) remoteFiles.push(f.relativePath.replace(/\\/g, '/'));
}
const remoteSet = new Set(remoteFiles);

const localFiles = [];
(function walk(d, rel = '') {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(d, e.name), r);
    else localFiles.push(r);
  }
})(localRoot);
const localSet = new Set(localFiles);

const missing = [...localSet].filter((f) => !remoteSet.has(f));
const extra = [...remoteSet].filter((f) => !localSet.has(f));
console.log('local files:', localSet.size, '| remote files:', remoteSet.size);
console.log('local but not remote:', missing);
console.log('remote but not local:', extra);

const { data: ttfData } = await api.client.get(`/builder/270873/assets/nebular-oblique-regular.ttf`);
const localBuf = fs.readFileSync(path.join(localRoot, 'assets/nebular-oblique-regular.ttf'));
const remoteBuf = Buffer.from(ttfData.content, 'base64');
console.log(
  'ttf bytes equal:',
  localBuf.equals(remoteBuf),
  `(local ${localBuf.length}b, remote ${remoteBuf.length}b)`
);
process.exit(0);