import fs from 'fs';
import { spawn } from 'child_process';

const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const target = process.argv[2] || 'http://localhost:8137/';
const outFile = process.argv[3] || 'dump2.html';
const userData = process.env.UD || 'C:\\Users\\BRIANF~1\\AppData\\Local\\Temp\\opencode\\chdump2';

const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox', `--user-data-dir=${userData}`, '--dump-dom', target];
const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
let err = '';
let done = false;
child.stdout.on('data', (d) => (out += d));
child.stderr.on('data', (d) => (err += d));
const killer = setTimeout(() => { if (!done) child.kill(); }, 20000);
child.on('close', () => {
  done = true;
  clearTimeout(killer);
  fs.writeFileSync(outFile, out, 'utf8');
  fs.writeFileSync('chrome-errors.log', err, 'utf8');
  console.log(outFile, 'bytes:', out.length, 'title:', (out.match(/<title>(.*?)<\/title>/s) || [])[1]);
});