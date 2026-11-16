import { packager } from '@electron/packager';
import { zipSync } from 'fflate';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim());
const version=pkg.version;
const stem='Mission-Architect-'+version+'-Windows-x64';
const staging=await fs.mkdtemp(path.join(root,'.desktop-stage-'));
const release=path.join(root,'release');
await fs.mkdir(release,{recursive:true});
try {
  await fs.cp(path.join(root,'dist'),path.join(staging,'dist'),{recursive:true});
  await fs.cp(path.join(root,'desktop'),path.join(staging,'desktop'),{recursive:true});
  await fs.writeFile(path.join(staging,'package.json'),JSON.stringify({name:pkg.name,version,main:'desktop/main.cjs',description:pkg.description,author:pkg.author},null,2));
  const files=await packager({dir:staging,out:path.join(release,commit.slice(0,7)+(dirty ? "-work-"+Date.now() : "")),platform:'win32',arch:'x64',name:'Mission Architect',executableName:'Mission Architect',appVersion:version,electronVersion:pkg.devDependencies.electron,asar:true,prune:false,overwrite:false,win32metadata:{CompanyName:'Mission Architect team',FileDescription:'Mission Architect educational mission-design game',ProductName:'Mission Architect'}});
  const folder=files[0];
  await fs.copyFile('public/textures/CREDITS.md',path.join(folder,'NASA-TEXTURE-CREDITS.md'));
  const lock=JSON.parse(await fs.readFile('package-lock.json','utf8'));const notices=[];
  for(const [relative,metadata] of Object.entries(lock.packages)) {
    if(!relative || metadata.dev)continue;
    const directory=path.join(root,relative);const entries=await fs.readdir(directory);
    const licenses=entries.filter(name=>/^(license|copying|notice)([.\\-]|$)/i.test(name));
    notices.push('PACKAGE '+relative+' '+metadata.version+' ('+(metadata.license ?? 'see package')+')');
    for(const name of licenses){const file=path.join(directory,name);if((await fs.stat(file)).isFile())notices.push(await fs.readFile(file,'utf8'));}
  }
  await fs.writeFile(path.join(folder,'THIRD-PARTY-LICENSES.txt'),notices.join('\n\n----------------\n\n'));
  await fs.writeFile(path.join(folder,'LEEME.txt'),'MISSION ARCHITECT '+version+'\r\n\r\nExtrae TODO el ZIP. Abre Mission Architect.exe. No requiere Node.js ni Internet para jugar.\r\nNo muevas el .exe sin las carpetas DLL/locales/resources. F11: pantalla completa. Alt: menu.\r\nWindows x64; WebGL 2 para 3D. Si falla la GPU, el modo 2D permite jugar.\r\nAplicacion sin firma digital. Descarga solo desde el repositorio del equipo.\r\nCodigo y errores: https://github.com/ShelB123/mission-architect-spaceapps-2026\r\n');
  const inventory=[];
  async function inventoryWalk(dir,prefix='') { for(const entry of await fs.readdir(dir,{withFileTypes:true})) { const relative=prefix+entry.name; if(entry.isDirectory())await inventoryWalk(path.join(dir,entry.name),relative+'/');else {const bytes=await fs.readFile(path.join(dir,entry.name));inventory.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
  await inventoryWalk(path.join(root,'dist'));
  const provenance={version,commit,dirty,electron:pkg.devDependencies.electron,platform:'win32',arch:'x64',builtAt:new Date().toISOString(),assets:inventory};
  await fs.writeFile(path.join(folder,'BUILD-INFO.json'),JSON.stringify(provenance,null,2));
  const zipEntries={};
  async function zipWalk(dir,prefix) { for(const entry of await fs.readdir(dir,{withFileTypes:true})) {if(entry.isDirectory())await zipWalk(path.join(dir,entry.name),prefix+entry.name+'/');else zipEntries[prefix+entry.name]=new Uint8Array(await fs.readFile(path.join(dir,entry.name)));}}
  await zipWalk(folder,stem+'/');
  const zip=zipSync(zipEntries,{level:6});
  const archive=path.join(release,stem+'.zip');await fs.writeFile(archive,zip);
  const digest=createHash('sha256').update(zip).digest('hex');await fs.writeFile(archive+'.sha256',digest+'  '+path.basename(archive)+'\n');
  console.log(JSON.stringify({folder,archive,sha256:digest,bytes:zip.length,commit,dirty},null,2));
 } finally {
  if(path.dirname(path.resolve(staging))!==path.resolve(root) || !path.basename(staging).startsWith('.desktop-stage-'))throw new Error('Refusing to remove staging outside workspace');
  await fs.rm(staging,{recursive:true,force:true});
}
