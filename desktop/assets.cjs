const path = require('node:path');
const MIME = Object.freeze({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'});
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'";
function resolveAsset(root, requestUrl) {
  let url, pathname;
  try { url = new URL(requestUrl); pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (url.protocol !== 'app:' || url.hostname !== 'mission' || url.port || url.username || url.password || pathname.includes('\\') || pathname.includes('\0')) return null;
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(path.resolve(root), target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return { path: target, type: MIME[path.extname(target).toLowerCase()] ?? 'application/octet-stream' };
}
function externalHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
module.exports = { resolveAsset, externalHttps, CSP };
