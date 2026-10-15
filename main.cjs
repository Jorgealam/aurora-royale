'use strict';
const {app,BrowserWindow,Menu}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const testRun=process.argv.includes('--test');
const reportArg=process.argv.find(v=>v.startsWith('--report='));
const reportDir=reportArg?path.resolve(reportArg.slice(9)):path.join(__dirname,'test-results');
const logs=[];let win;
app.setName('Aurora Royale');
app.on('window-all-closed',()=>app.quit());
app.whenReady().then(async()=>{
  Menu.setApplicationMenu(null);
  win=new BrowserWindow({width:1366,height:820,minWidth:900,minHeight:620,show:!testRun||process.argv.includes('--test-visible'),backgroundColor:'#182c2b',title:'Aurora Royale',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,spellcheck:false}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.on('console-message',(_event,...args)=>{const detail=args[0];const msg=typeof detail==='object'?detail.message:args[1];logs.push({level:typeof detail==='object'?detail.level:detail,message:msg});});
  win.webContents.on('render-process-gone',(_event,detail)=>{logs.push({error:'renderer gone',detail});if(testRun){fs.mkdirSync(reportDir,{recursive:true});fs.writeFileSync(path.join(reportDir,'crash.json'),JSON.stringify({logs,detail},null,2));app.exit(1);}});
  win.webContents.session.setPermissionRequestHandler((_wc,permission,callback)=>callback(permission==='pointerLock'||permission==='fullscreen'));
  win.webContents.session.webRequest.onBeforeRequest((details,callback)=>{callback({cancel:!(details.url.startsWith('file://')||details.url.startsWith('blob:')||details.url.startsWith('data:')||details.url.startsWith('devtools:'))});});
  await win.loadFile(path.join(__dirname,'game','index.html'),testRun?{query:{test:'1'}}:{});
  if(testRun){try{
    fs.mkdirSync(reportDir,{recursive:true});
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    await wait(1500);
    const source=fs.readFileSync(path.join(__dirname,'tests','renderer.test.js'),'utf8');
    const report=await win.webContents.executeJavaScript(source,true);
    report.console=logs;report.electron=process.versions.electron;report.chromium=process.versions.chrome;report.gpu=await app.getGPUInfo('basic');report.gpuFeatures=app.getGPUFeatureStatus();
    fs.writeFileSync(path.join(reportDir,'integration.json'),JSON.stringify(report,null,2));
    win.showInactive();await wait(500);
    const png=await win.webContents.capturePage();fs.writeFileSync(path.join(reportDir,'gameplay.png'),png.toPNG());
    await win.webContents.executeJavaScript('Aurora.test.menu()');await wait(500);
    const menu=await win.webContents.capturePage();fs.writeFileSync(path.join(reportDir,'menu.png'),menu.toPNG());
    app.exit(report.failed?1:0);
  }catch(e){fs.mkdirSync(reportDir,{recursive:true});fs.writeFileSync(path.join(reportDir,'error.json'),JSON.stringify({error:e.stack,logs},null,2));app.exit(1);}}
});
