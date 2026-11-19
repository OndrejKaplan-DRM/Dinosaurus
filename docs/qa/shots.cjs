const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs');
const OUT='/home/claude/work/dinos/qa/shots/';
(async()=>{
  const gl = process.env.GL==='1';
  const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome', args: gl?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']:['--disable-gpu']});
  async function run(name, vp, mobile){
    const ctx = await browser.newContext(mobile?{viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:vp});
    const page = await ctx.newPage(); const errs=[];
    page.on('pageerror',e=>errs.push('PAGEERROR '+e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
    await page.goto('http://127.0.0.1:8791/');
    await page.waitForFunction(()=>!document.getElementById('interface').hidden,null,{timeout:170000});
    const shot=async n=>{await page.waitForTimeout(600);await page.screenshot({path:OUT+name+'_'+n+'.png',timeout:170000});};
    const d=()=>page.evaluate(()=>window.dinosDiagnostics());
    console.log(name, JSON.stringify(await d()).slice(0,260));
    await shot('1_menu');
    await page.evaluate(()=>document.querySelector('[data-action="settings"]').click()); await shot('2_nastaveni');
    await page.evaluate(()=>document.querySelector('#settings [data-action="close"]').click());
    await page.evaluate(()=>document.querySelector('[data-action="help"]').click()); await shot('3_jak_hrat');
    await page.evaluate(()=>document.querySelector('#help [data-action="close"]').click());
    await page.evaluate(()=>document.querySelector('[data-action="developer"]').click()); await shot('4_vyvojar');
    if(!mobile){ await page.evaluate(()=>{document.querySelectorAll('#developer details').forEach(x=>x.open=true);document.querySelector('#developer .card').scrollTop=600;}); await shot('4b_vyvojar_dole'); await page.evaluate(()=>{document.querySelector('#developer .card').scrollTop=99999;}); await shot('4c_vyvojar_konec'); }
    await page.evaluate(()=>document.querySelector('#developer [data-action="close"]').click());
    await page.evaluate(()=>document.querySelector('[data-action="practice"]').click());
    await page.waitForFunction(()=>window.dinosDiagnostics().phase==='playing',null,{timeout:120000}); await page.waitForTimeout(1500); await shot('5_hra');
    await page.evaluate(()=>document.querySelector('[data-action="pause"]').click()); await shot('6_pauza');
    await page.evaluate(()=>document.querySelector('#pause [data-action="menu"]').click());
    await page.evaluate(()=>document.querySelector('[data-action="roam"]').click()); await shot('7_haj');
    console.log(name,'errs',errs.length, errs.slice(0,3)); await ctx.close();
  }
  await run('pc',{width:1280,height:720},false);
  await run('mob_v',{width:390,height:844},true);
  await run('mob_s',{width:844,height:390},true);
  await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
