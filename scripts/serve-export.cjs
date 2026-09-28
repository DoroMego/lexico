// Local-only static-export preview. Mirrors this project's cleanUrls configuration.
// Run after `npx expo export -p web`; never proxies to a backend.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('dist');
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
if (!config.cleanUrls || config.rewrites?.length) throw new Error('Update the preview server if routing configuration changes.');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon'};
http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end(); }
  const base = path.resolve(root, '.' + pathname);
  if (base !== root && !base.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  const candidates = [base, base + '.html', path.join(base, 'index.html')];
  const file = candidates.find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  for (const group of config.headers ?? []) {
    if (group.source === '/(.*)') for (const h of group.headers) res.setHeader(h.key, h.value);
  }
  res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
  res.setHeader('Cache-Control','no-store');
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT || 18097),'127.0.0.1',()=>console.log('Public sample export: http://localhost:'+(process.env.PORT || 18097)));
