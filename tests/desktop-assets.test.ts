import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const { resolveAsset, externalHttps, CSP }=require('../desktop/assets.cjs');
const root=path.resolve('dist');
describe('bundled desktop asset boundary',()=>{
  it('resolves the game entry, lazy modules and NASA textures within the package',()=>{
    expect(resolveAsset(root,'app://mission/').path).toBe(path.join(root,'index.html'));
    expect(resolveAsset(root,'app://mission/assets/FlightScene-hash.js').type).toBe('text/javascript; charset=utf-8');
    expect(resolveAsset(root,'app://mission/textures/earth-blue-marble.jpg').path).toBe(path.join(root,'textures','earth-blue-marble.jpg'));
    expect(resolveAsset(root,'app://mission/assets/a.js?v=1').path).toBe(path.join(root,'assets','a.js'));
  });
  it.each(['https://mission/index.html','file:///etc/passwd','app://other/index.html','app://user:password@mission/index.html','app://mission:123/index.html','app://mission/%2e%2e%2fsecret','app://mission/%5c..%5csecret','app://mission/%00secret','app://mission/%ZZ'])('rejects remote or escaped paths: %s',(url)=>expect(resolveAsset(root,url)).toBeNull());
  it('allows only credential-free HTTPS references outside the app',()=>{
    expect(externalHttps('https://science.nasa.gov/moon/facts/')).toBe(true);
    for(const url of ['javascript:alert(1)','file:///C:/Windows','http://example.org','https://user:password@example.org','invalid'])expect(externalHttps(url)).toBe(false);
    expect(CSP).toContain("script-src 'self'");expect(CSP).toContain("object-src 'none'");
  });
});
