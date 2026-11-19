const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--disable-gpu']});const p=await b.newPage({viewport:{width:1280,height:720}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://127.0.0.1:8791/');await p.waitForFunction(()=>!document.getElementById('interface').hidden,null,{timeout:170000});
const d=await p.evaluate(()=>window.dinosDiagnostics());console.log(d.version,d.renderer);
await p.evaluate(()=>document.querySelector('#menu [data-action="practice"]').click());await p.waitForFunction(()=>window.dinosDiagnostics().distance>6,null,{timeout:170000});
await p.screenshot({path:'/home/claude/work/dinos/qa/shots/tex_271_hra.png',timeout:170000});console.log('errs',errs.length,errs.slice(0,2));await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
