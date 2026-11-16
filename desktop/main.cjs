const { app, BrowserWindow, protocol, session, shell, Menu, dialog } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { resolveAsset, externalHttps, CSP } = require('./assets.cjs');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
app.setName('Mission Architect');
let mainWindow;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if(mainWindow) { if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus(); } });
  app.whenReady().then(async () => {
    const root = path.join(app.getAppPath(), 'dist');
    protocol.handle('app', async request => {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', {status:405});
      const asset = resolveAsset(root, request.url);
      if (!asset) return new Response('Forbidden', {status:403});
      try { const data = await fs.readFile(asset.path); return new Response(request.method === 'HEAD' ? null : data, {headers:{'Content-Type':asset.type,'Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff'}}); }
      catch { return new Response('Not found', {status:404}); }
    });
    session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    mainWindow = new BrowserWindow({width:1440,height:960,minWidth:900,minHeight:650,show:false,backgroundColor:'#0c151b',title:'Mission Architect',autoHideMenuBar:true,
      webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
    mainWindow.webContents.setWindowOpenHandler(({url}) => { if(externalHttps(url))void shell.openExternal(url); return {action:'deny'}; });
    mainWindow.webContents.on('will-navigate', (event, url) => { if(url !== 'app://mission/' && url !== 'app://mission/index.html' && url !== 'app://mission/#') { event.preventDefault();if(externalHttps(url))void shell.openExternal(url); } });
    mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
    mainWindow.webContents.on('did-fail-load', (_event,code,description,_url,isMainFrame) => {if(isMainFrame && code !== -3)dialog.showErrorBox('Mission Architect', 'No se pudo abrir el juego: '+description);});
    Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Juego / Game',submenu:[{label:'Pantalla completa / Full screen',role:'togglefullscreen'}, {label:'Salir / Quit',role:'quit'}]},{label:'Vista / View',submenu:[{role:'zoomIn'},{role:'zoomOut'},{role:'resetZoom'}]}]));
    mainWindow.once('ready-to-show',()=>{mainWindow.maximize();mainWindow.show();});
    await mainWindow.loadURL('app://mission/');
  }).catch(error => {dialog.showErrorBox('Mission Architect',String(error));app.quit();});
  app.on('window-all-closed',()=>app.quit());
}
