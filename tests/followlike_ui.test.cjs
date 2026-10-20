// The studio form for "Follow + like" (and, on Instagram, the home feed source).
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');let passed=0;
const check=(n,v)=>{if(!v){console.error('FAIL '+n);process.exitCode=1;throw new Error('FAIL '+n);}passed++;console.log('PASS '+n);};
(async()=>{
 const html=read('dashboard.html'),IG=/instagram/i.test(read('manifest.json'));
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-crashpad-for-testing']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();const errors=[];pg.on('pageerror',e=>errors.push(e.message));
 await pg.setContent(html.replace(/<script[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,''));
 await pg.evaluate(()=>{const store={history:[],config:null};window.__sent=[];window.chrome={storage:{local:{get:async k=>{const o={};[].concat(k||[]).forEach(x=>{if(x in store)o[x]=store[x];});return o;},set:async o=>Object.assign(store,o),remove:async()=>{}},onChanged:{addListener(){}}},runtime:{id:'x',getManifest:()=>({name:'Aurora',version:'1.2.0'}),getURL:x=>x,sendMessage:async m=>{window.__sent.push(m);return{ok:true,message:'ok'};},onMessage:{addListener(){}}},permissions:{contains:async()=>true},tabs:{query:async()=>[]},alarms:{}};});
 await pg.addStyleTag({content:read('style.css').replace(/@import[^;]*;/g,'')});
 for(const f of ['selectors.js','engine.js','comments.js','report.js'])await pg.addScriptTag({content:read(f)});
 await pg.addScriptTag({content:'globalThis.AuroraLicenseConfig={enforce:false,siteUrl:"https://x.test"};'});await pg.addScriptTag({content:read('dashboard.js')});await pg.waitForTimeout(250);
 const opt=(sel,v)=>pg.evaluate(([s,v])=>{const o=[...document.querySelector(s).options].find(x=>x.value===v);return o?o.textContent:null;},[sel,v]);
 check('the action list has "Follow + like"',await opt('#action','followlike')==='Follow + like');
 await pg.selectOption('#action','followlike');await pg.selectOption('#mode','users');await pg.waitForTimeout(80);
 check('Follow + like explains itself and shows how many posts to like per profile',/Follows each account and likes/.test(await pg.textContent('#actionHint'))&&await pg.evaluate(()=>!document.getElementById('perUser').parentElement.hidden)&&/like per profile/i.test(await pg.textContent('label[for="perUser"]')));
 check('the settings carry the new action to the engine',await pg.evaluate(()=>settings().action==='followlike'));
 await pg.fill('#target','alice');await pg.waitForTimeout(80);
 check('the summary names the action',/Follow \+ like/.test(await pg.textContent('#startSummary')));
 await pg.uncheck('#dry');await pg.click('#start');await pg.waitForTimeout(150);
 check('starting live asks for confirmation in plain words ("follow and like")',/Confirm live follow \+ like/.test(await pg.textContent('#start'))&&/follow and like/.test(await pg.textContent('#notice')));
 if(IG){
  check('the source list has "Your home feed"',await opt('#mode','feed')==='Your home feed');
  await pg.check('#dry');await pg.fill('#target','');await pg.selectOption('#mode','feed');await pg.waitForTimeout(100);
  check('home feed: the target box is not needed (disabled, not required) and says so',await pg.evaluate(()=>{const t=document.getElementById('target');return t.disabled&&!t.required&&/home feed/i.test(t.placeholder)&&document.getElementById('task').checkValidity();}));
  check('home feed: the discovery limit is available and the summary says "your home feed"',await pg.evaluate(()=>!document.getElementById('scanGroup').hidden)&&/your home feed/.test(await pg.textContent('#startSummary')));
  check('home feed: the hint says nothing needs to be entered',/Nothing to enter/.test(await pg.textContent('#hint')));
  await pg.selectOption('#action','like');await pg.uncheck('#dry');await pg.click('#start');await pg.waitForTimeout(150);
  check('home feed: the live confirmation names it',/your home feed/.test(await pg.textContent('#notice')));
  await pg.selectOption('#mode','users');await pg.waitForTimeout(80);
  check('choosing another source brings the target box back (required again)',await pg.evaluate(()=>{const t=document.getElementById('target');return !t.disabled&&t.required;})&&/Target/.test(await pg.textContent('label[for="target"]')));
 }else{
  check('TikTok has no home-feed source (its For You feed has no stable video addresses, so it is not offered)',await opt('#mode','feed')===null);
 }
 check('no uncaught page errors',!errors.length);
 await b.close();console.log(`\n${passed} follow+like form checks passed`);
})().catch(e=>{console.error(e.message);process.exit(1);});
