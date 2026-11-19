const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async()=>{
  const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome', args:['--disable-gpu']});
  const R={};
  const ready=p=>p.waitForFunction(()=>!document.getElementById('interface').hidden,null,{timeout:170000});
  // A: telefon na šířku
  { const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}); const p=await ctx.newPage(); await p.goto('http://127.0.0.1:8791/'); await ready(p);
    R.landscape=await p.evaluate(()=>{const vis=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),inView:r.top>=0&&r.bottom<=innerHeight};};const m=document.getElementById('menu'),cs=getComputedStyle(m);return {vh:innerHeight,start:vis('#menu [data-action="start"]'),practice:vis('#menu [data-action="practice"]'),roam:vis('#menu [data-action="roam"]'),settings:vis('#menu [data-action="settings"]'),overflowY:cs.overflowY,scrollH:m.scrollHeight,clientH:m.clientHeight,bodyScroll:document.documentElement.scrollHeight>innerHeight,bodyOverflow:getComputedStyle(document.body).overflow};});
    console.log(JSON.stringify(R)); await ctx.close(); }
  // B: počítač
  { const ctx=await browser.newContext({viewport:{width:1280,height:720}}); const p=await ctx.newPage(); await p.goto('http://127.0.0.1:8791/'); await ready(p);
    await p.focus('#menu [data-action="settings"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    R.focusOnOpen=await p.evaluate(()=>({panelOpen:!document.getElementById('settings').hidden,active:document.activeElement.tagName+'#'+document.activeElement.id}));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    R.focusAfterEsc=await p.evaluate(()=>({panelOpen:!document.getElementById('settings').hidden,active:document.activeElement.tagName+'#'+(document.activeElement.id||document.activeElement.dataset?.action||'')}));
    await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
    R.arrowInMenu=await p.evaluate(()=>document.activeElement.tagName+'#'+(document.activeElement.dataset?.action||''));
    // trvalost + únik vývojářského počasí
    await p.evaluate(()=>{document.querySelector('#menu [data-action="developer"]').click();const w=document.getElementById('dev-weather');w.value='rain';w.dispatchEvent(new Event('change'));document.querySelector('#developer [data-action="close"]').click();document.querySelector('#menu [data-action="settings"]').click();const m=document.getElementById('master');m.value=30;m.dispatchEvent(new Event('input'));});
    R.stored=await p.evaluate(()=>localStorage.getItem('dinos-settings-v2'));
    await p.reload(); await ready(p);
    R.afterReload=await p.evaluate(()=>({master:document.getElementById('master').value,weather:document.getElementById('weather').value,env:window.dinosDiagnostics().environment.weather}));
    // poškozené úložiště
    await p.evaluate(()=>localStorage.setItem('dinos-settings-v2','{"master":"abc","weather":"lava","difficulty":7,"timeScale":3,'));
    await p.reload(); await ready(p);
    R.corrupt=await p.evaluate(()=>({master:document.getElementById('master').value,weather:document.getElementById('weather').value}));
    // Esc ve hře
    await p.evaluate(()=>document.querySelector('#menu [data-action="practice"]').click()); await p.waitForFunction(()=>window.dinosDiagnostics().phase==='playing',null,{timeout:120000});
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); const a=await p.evaluate(()=>window.dinosDiagnostics().phase);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); const b=await p.evaluate(()=>window.dinosDiagnostics().phase);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.evaluate(()=>document.querySelector('#pause [data-action="menu"]').click()); await p.waitForTimeout(300);
    R.esc={afterFirst:a,afterSecond:b,afterMenu:await p.evaluate(()=>window.dinosDiagnostics().phase)};
    console.log(JSON.stringify(R)); await ctx.close(); }
  console.log(JSON.stringify(R,null,1)); await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
