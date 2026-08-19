import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';

const { default: SellAuthAPI } = await import(
  pathToFileURL('C:/Users/Brian Fidelio/AppData/Roaming/npm/node_modules/sellauth-theme-cli/lib/sellauth-api.js')
);

const api = new SellAuthAPI({ apiKey: '6053187|LeTaiCfw1KcRJPK1ff8ij06lh5ChpqYj5mfRdHu4ff62da4d' });

const themeId = process.argv[2];
const template = process.argv[3] || 'shop';
const outFile = process.argv[4] || `preview-${themeId}.html`;

const token = await api.generateBuilderToken('261900', themeId);
const url = api.getBuilderPreviewUrl('261900', themeId, token.token, template);

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userData = 'C:\\Users\\BRIANF~1\\AppData\\Local\\Temp\\opencode\\chprev';
const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox', `--user-data-dir=${userData}`, '--virtual-time-budget=15000', '--dump-dom', url], { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
child.stdout.on('data', (d) => (out += d));
child.on('close', () => {
  fs.writeFileSync(outFile, out, 'utf8');
  const ok = out.length > 500 && out.indexOf('Error occurred while rendering') === -1;
  console.log(`theme ${themeId} template ${template}: ${ok ? 'OK' : 'ERROR'} (${out.length}b)${ok ? '' : ' ' + out.slice(0, 120)}`);
  process.exit(0);
});
child.stderr.on('data', () => {});