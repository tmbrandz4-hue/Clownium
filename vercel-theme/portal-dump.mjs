import fs from 'fs';
import { spawn } from 'child_process';

const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const target = process.argv[2] || 'https://clownium.mysellauth.com/customer';
const outFile = process.argv[3] || 'portal-dump.html';
const userData = process.env.UD || 'C:\\Users\\BRIANF~1\\AppData\\Local\\Temp\\opencode\\chportal';

const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox', `--user-data-dir=${userData}`, '--virtual-time-budget=15000', '--dump-dom', target];
const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
let err = '';
child.stdout.on('data', (d) => (out += d));
child.stderr.on('data', (d) => (err += d));
child.on('close', () => {
  fs.writeFileSync(outFile, out, 'utf8');
  fs.writeFileSync('chrome-errors.log', err, 'utf8');
  console.log(outFile, 'bytes:', out.length, 'title:', (out.match(/<title>(.*?)<\/title>/s) || [])[1]);
  console.log('has Please-wait challenge:', out.indexOf('Please wait') !== -1);
  console.log('has loader-wrapper:', out.indexOf('loader-wrapper') !== -1);
  console.log('exit:', 0);
});