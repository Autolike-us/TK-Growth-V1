// Offline check of "follow from the followers/following list": open the list, press Follow on each row in place, scroll for more, close.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');let passed=0;const check=(n,v)=>{assert(v,n);passed++;console.log('PASS '+n);};
const MOCK=`window.data={job:{id:'test',status:'running'},receipts:{},history:[]};window.listeners=[];
window.chrome={runtime:{id:'extension',onMessage:{addListener:f=>listeners.push(f)},sendMessage:async()=>({ok:true})},storage:{local:{get:async()=>structuredClone(data),set:async x=>Object.assign(data,structuredClone(x)),remove:async()=>{}},onChanged:{addListener:()=>{}}}};
const nt=window.setTimeout;window.setTimeout=(f,ms,...a)=>nt(f,Math.min(ms||0,10),...a);`;
// Mirrors TikTok's markup: profile counts (data-e2e="following"/"followers"), the follow-info-popup dialog with tabs and a scrolling list of <li> rows, each with a data-e2e="follow-button".
const page=(states)=>`<html lang="en"><body><a data-e2e="profile-icon" href="https://www.tiktok.com/@me">me</a><main><div data-e2e="user-page"><h1 data-e2e="user-title">Suis</h1><h2 data-e2e="user-subtitle">jeff509vertilusdo</h2>
<h3><div><strong data-e2e="following-count">5059</strong><span data-e2e="following">Following</span></div><div><strong data-e2e="followers-count">209</strong><span data-e2e="followers">Followers</span></div></h3></div></main>
<style>#list{max-height:200px;overflow-y:auto}#list li{height:60px;list-style:none}</style>
<script>
window.__loc={pathname:'/@jeff509vertilusdo',get href(){return 'https://www.tiktok.com'+this.pathname;}};
var states=${JSON.stringify(states)};window.follows=[];window.tabClicks=[];window.opened=null;var shown=6,dlg=null;
function row(i){const n=states[i];return '<li><div><div><a href="https://www.tiktok.com/@'+n.name+'"><div><p>'+n.name+'</p></div></a><div><button type="button" data-e2e="follow-button" aria-label="Follow '+n.name+'">'+n.text+'</button></div></div></div></li>';}
function fill(){if(!dlg)return;const list=dlg.querySelector('#list');list.innerHTML=states.slice(0,shown).map((_,i)=>row(i)).join('');list.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{if(states[i].text==='Follow'){states[i].text='Following';window.follows.push(states[i].name);b.textContent='Following';}});}
function openDialog(which){window.opened=which;dlg=document.createElement('section');dlg.setAttribute('role','dialog');
 dlg.innerHTML='<div role="dialog" data-e2e="follow-info-popup"><h1>jeff509vertilusdo</h1><div role="button" aria-label="Close_button" data-e2e="follow-popup-close"></div><div class="DivTabs"><div class="x--DivTabItem"><div>Following</div><strong>5059</strong></div><div class="x--DivTabItem"><div>Followers</div><strong>209</strong></div><div class="x--DivTabItem">Suggested</div></div><div id="list"></div></div>';
 document.body.append(dlg);fill();
 dlg.querySelectorAll('.x--DivTabItem').forEach(t=>t.addEventListener('click',()=>window.tabClicks.push(t.firstElementChild?t.firstElementChild.textContent:t.textContent)));
 dlg.querySelector('#list').addEventListener('scroll',e=>{const l=e.target;if(l.scrollTop+l.clientHeight>=l.scrollHeight-30&&shown<states.length){shown=Math.min(states.length,shown+6);fill();}});
 dlg.querySelector('[data-e2e="follow-popup-close"]').onclick=()=>{dlg.remove();dlg=null;};}
document.querySelector('[data-e2e="followers"]').onclick=()=>openDialog('followers');document.querySelector('[data-e2e="following"]').onclick=()=>openDialog('following');
</script></body></html>`;
const names=(over={})=>Array.from({length:14},(_,i)=>({name:'u'+(i+1),text:'Follow',...(over[i+1]||{})}));
const STATES=names({2:{text:'Following'},5:{name:'me'},9:{text:'Requested'}});
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-crashpad-for-testing']});
try{const ctx=await browser.newContext();
 const run=async(states,config,step={})=>{const pg=await ctx.newPage();pg.setDefaultTimeout(60000);pg.on('pageerror',e=>{throw e;});await pg.setContent(page(states));await pg.addScriptTag({content:MOCK});await pg.addScriptTag({content:read('selectors.js')});await pg.addScriptTag({content:'{const location=window.__loc;'+read('dom.js')+'\n'+read('content.js')+'}'});
  const r=await pg.evaluate(([c,s])=>new Promise(res=>listeners[0]({action:'step',step:{kind:'listfollow',url:'https://www.tiktok.com/@jeff509vertilusdo',username:'jeff509vertilusdo',source:'followers',label:'followers of @jeff509vertilusdo',...s},config:{action:'follow',dry:false,mode:'followers',perUser:3,limit:4,delay:30,exclude:[],maxAge:0,scanLimit:30,...c},jobId:'test'},{id:'extension'},res)),[config,step]);return {r,pg};};
 let {r,pg}=await run(STATES,{});
 check('follows people straight from the open followers list (skipping one already followed, one requested and yourself)',r.performed&&r.count===4&&/Followed 4 accounts from the followers of @jeff509vertilusdo/.test(r.message)&&await pg.evaluate(()=>JSON.stringify(follows)===JSON.stringify(['u1','u3','u4','u6'])));
 check('no profile page was opened and the list was closed afterwards',await pg.evaluate(()=>__loc.pathname==='/@jeff509vertilusdo'&&!document.querySelector('[data-e2e="follow-info-popup"]')));
 check('live progress is written while the list is worked through',await pg.evaluate(()=>data.walk&&data.walk.id==='test'&&data.walk.acted===4&&/followers of/.test(data.walk.text)));
 ({r,pg}=await run(STATES,{limit:8}));check('it scrolls the list to load more people when the first rows are used up',r.performed&&r.count===8&&await pg.evaluate(()=>follows.length===8&&follows.includes('u10')));
 ({r,pg}=await run(STATES,{dry:true}));check('preview checks the list without pressing Follow',r.preview&&r.count===4&&await pg.evaluate(()=>follows.length===0));
 ({r,pg}=await run(STATES,{exclude:['u3']}));check('excluded accounts are skipped',r.performed&&await pg.evaluate(()=>!follows.includes('u3')&&follows.length===4));
 ({r,pg}=await run(STATES,{scanLimit:3}));check('the scan limit caps how many list rows are looked at',r.performed&&r.count===2&&await pg.evaluate(()=>JSON.stringify(follows)===JSON.stringify(['u1','u3'])));
 ({r}=await run(STATES,{},{room:2}));check('the remaining daily cap is respected',r.performed&&r.count===2);
 ({r}=await run(STATES,{limit:5},{done:4}));check('the remaining task limit is respected',r.performed&&r.count===1);
 ({r,pg}=await run(STATES,{mode:'following'},{source:'following',label:'following of @jeff509vertilusdo'}));check('the following list is opened and its tab selected',r.performed&&await pg.evaluate(()=>opened==='following'&&tabClicks.includes('Following')));
 ({r}=await run(names(Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,{text:'Following'}]))),{}));check('a list where everyone is already followed is skipped politely',!r.performed&&/Skipped/.test(r.message));
 console.log('\n'+passed+' list-follow checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
