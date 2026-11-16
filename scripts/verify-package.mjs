import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { unzipSync } from 'fflate';
const require=createRequire(import.meta.url);const {extractFile,listPackage}=require('@electron/asar');
const file=process.argv[2];if(!file)throw new Error('Usage: node scripts/verify-package.mjs release/file.zip');
const bytes=await fs.readFile(file);const expected=(await fs.readFile(file+'.sha256','utf8')).split(/\s/)[0];
if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('ZIP checksum mismatch');
const entries=unzipSync(bytes);const prefix=Object.keys(entries).find(key=>key.endsWith('/BUILD-INFO.json'))?.replace(/BUILD-INFO.json$/,'');if(!prefix)throw new Error('Missing build information');
for(const name of ['Mission Architect.exe','resources/app.asar','icudtl.dat','resources.pak','LICENSE','LICENSES.chromium.html','LEEME.txt','NASA-TEXTURE-CREDITS.md','THIRD-PARTY-LICENSES.txt'])if(!entries[prefix+name]?.length)throw new Error('Missing '+name);
const exe=entries[prefix+'Mission Architect.exe'];const view=new DataView(exe.buffer,exe.byteOffset,exe.byteLength);if(view.getUint16(0,true)!==0x5a4d||view.getUint16(view.getUint32(0x3c,true)+4,true)!==0x8664)throw new Error('Not a Windows x64 PE executable');
const info=JSON.parse(new TextDecoder().decode(entries[prefix+'BUILD-INFO.json']));
const tmp=await fs.mkdtemp(path.join(process.cwd(),'.desktop-check-'));try {const asar=path.join(tmp,'app.asar');await fs.writeFile(asar,entries[prefix+'resources/app.asar']);const packaged=listPackage(asar);if(packaged.some(p=>/node_modules|\.git[\/]/.test(p)))throw new Error('Unexpected development files in archive');
for(const asset of info.assets){const actual=extractFile(asar,path.join('dist',asset.path));if(actual.length!==asset.bytes||createHash('sha256').update(actual).digest('hex')!==asset.sha256)throw new Error('Asset mismatch: '+asset.path);}
for(const name of ['desktop/main.cjs','desktop/assets.cjs','dist/index.html','dist/textures/earth-blue-marble.jpg','dist/textures/moon-lroc.jpg'])extractFile(asar,path.normalize(name));
const packagedPkg=JSON.parse(extractFile(asar,'package.json').toString());if(packagedPkg.version!==info.version||packagedPkg.main!=='desktop/main.cjs')throw new Error('Invalid app entry/version');
console.log(JSON.stringify({verified:true,version:info.version,commit:info.commit,dirty:info.dirty,assets:info.assets.length,zipBytes:bytes.length,sha256:expected},null,2));
 }finally{
if(path.dirname(path.resolve(tmp))!==path.resolve(process.cwd()) || !path.basename(tmp).startsWith('.desktop-check-'))throw new Error('Refusing to remove temporary directory outside workspace');
await fs.rm(tmp,{recursive:true,force:true});
}
