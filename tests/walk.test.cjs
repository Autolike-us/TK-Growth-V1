// Offline check of the in-place TikTok walk: open the first video, like it, press the next-video arrow, repeat, close.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');let passed=0;const check=(n,v)=>{assert(v,n);passed++;console.log('PASS '+n);};
const MOCK=`window.data={job:{id:'test',status:'running'},receipts:{},history:[]};window.listeners=[];
window.chrome={runtime:{id:'extension',onMessage:{addListener:f=>listeners.push(f)},sendMessage:async()=>({ok:true})},storage:{local:{get:async()=>structuredClone(data),set:async x=>Object.assign(data,structuredClone(x)),remove:async()=>{}},onChanged:{addListener:()=>{}}}};
const nt=window.setTimeout;window.setTimeout=(f,ms,...a)=>nt(f,Math.min(ms||0,10),...a);`;
// Mirrors TikTok's markup: grid tiles (data-e2e="channel-item" with a video link), and the viewer with browse-* controls and the "Go to next video" arrow.
const page=({path:p,vids,arrow=true,keyNav=false,glitch=false})=>`<html lang="en"><body><a data-e2e="profile-icon" href="https://www.tiktok.com/@me">me</a><main><div id="grid">`+vids.map(v=>`<div data-e2e="channel-item" role="button" tabindex="0"><a href="https://www.tiktok.com/@${v.a}/video/${v.id}"><img src="x"></a></div>`).join('')+`</div></main>
<script>
window.__loc={pathname:'${p}',get href(){return 'https://www.tiktok.com'+this.pathname;}};
var vids=${JSON.stringify(vids)},arrow=${arrow},keyNav=${keyNav},glitch=${glitch};window.posts=[];window.liked=Object.fromEntries(vids.filter(v=>v.liked).map(v=>[v.id,true]));window.followed=Object.fromEntries(vids.filter(v=>v.followed).map(v=>[v.a,true]));window.follows=[];window.decoyClicks=0;window.clicks=0;window.arrowClicks=0;var modal=null,idx=-1,home='${p}';
function open(i){idx=i;__loc.pathname='/@'+vids[idx].a+'/video/'+vids[idx].id;render();}
function render(){modal?.remove();modal=document.createElement('div');modal.setAttribute('data-e2e','browse-video-container');const v=vids[idx];
 modal.innerHTML='<div class="card"><a data-e2e="browse-username" href="https://www.tiktok.com/@'+v.a+'">'+v.a+'</a><button type="button" data-e2e="browse-follow" id="fbtn">'+(window.followed[v.a]?'Following':'Follow')+'</button></div><div class="suggest"><a href="https://www.tiktok.com/@zzz">zzz</a><button type="button" id="decoy">Follow</button></div><div class="css-1x2y3z-7937d88b--DivCommentContainer e1abc"><div class="bar"><button type="button" id="likebtn" aria-label="28 Likes" aria-pressed="'+(!!window.liked[v.id])+'"><span data-e2e="browse-like-icon"><svg></svg></span><strong>28</strong></button><button type="button" disabled><span data-e2e="browse-comment-icon"><svg></svg></span><strong>4</strong></button></div></div>'
  +'<div data-e2e="search-comment-container"><div data-e2e="comment-input"><div contenteditable="true" role="textbox" id="cbox"></div></div><button data-e2e="comment-post" id="post" type="button">Post</button><div id="rows"></div></div>'+(arrow&&idx<vids.length-1?'<button data-e2e="arrow-right" role="button" aria-label="Go to next video" id="nav"><svg></svg></button>':'')+'<button data-e2e="browse-close" aria-label="Close" id="close"><svg></svg></button>';
 document.body.append(modal);
 modal.querySelector('#likebtn').onclick=()=>{window.clicks++;window.liked[v.id]=true;render();};
 const nav=modal.querySelector('#nav');if(nav)nav.onclick=()=>{window.arrowClicks++;open(idx+1);};
 const cbox=modal.querySelector('#cbox');cbox.addEventListener('input',()=>{if(glitch&&!window.glitched){window.glitched=true;modal.remove();modal=null;__loc.pathname=home;}});
 modal.querySelector('#post').onclick=()=>{window.posts.push({id:v.id,text:cbox.textContent});modal.querySelector('#rows').innerHTML='<div data-e2e="comment-item"><a href="https://www.tiktok.com/@me">me</a><span>'+cbox.textContent+'</span></div>';cbox.textContent='';};
 modal.querySelector('#fbtn').onclick=()=>{if(!window.followed[v.a]){window.followed[v.a]=true;window.follows.push(v.a);}render();};
 modal.querySelector('#decoy').onclick=()=>{window.decoyClicks++;};
 modal.querySelector('#close').onclick=()=>{modal.remove();modal=null;__loc.pathname=home;};}
document.addEventListener('keydown',e=>{if(keyNav&&modal&&e.key==='ArrowDown'&&idx<vids.length-1)open(idx+1);});
document.querySelectorAll('#grid a').forEach((a,i)=>a.onclick=e=>{e.preventDefault();open(i);});
</script></body></html>`;
const PROFILE=page({path:'/@dabijou',vids:[{a:'dabijou',id:'111',liked:true},{a:'dabijou',id:'222'},{a:'dabijou',id:'333'},{a:'dabijou',id:'444'}]});
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-crashpad-for-testing']});
try{const ctx=await browser.newContext();
 const run=async(html,config,step={})=>{const pg=await ctx.newPage();pg.setDefaultTimeout(60000);pg.on('pageerror',e=>{throw e;});await pg.setContent(html);await pg.evaluate(()=>{window.glitched=false;});await pg.addScriptTag({content:MOCK});await pg.addScriptTag({content:read('selectors.js')});await pg.addScriptTag({content:'{const location=window.__loc;'+read('dom.js')+'\n'+read('content.js')+'}'});
  const r=await pg.evaluate(([c,s])=>new Promise(res=>listeners[0]({action:'step',step:{kind:'walk',url:'https://www.tiktok.com'+__loc.pathname,username:'dabijou',label:'@dabijou',...s},config:{action:'like',dry:false,mode:'users',perUser:3,limit:10,delay:30,exclude:[],maxAge:0,scanLimit:5,comment:'Nice!',...c},jobId:'test'},{id:'extension'},res)),[config,step]);return {r,pg};};
 let {r,pg}=await run(PROFILE,{});
 check('walk likes the first 3 eligible videos (skipping one already liked) and reports the count',r.performed&&r.count===3&&/Liked 3 videos on @dabijou/.test(r.message)&&/1 already liked skipped/.test(r.message));
 check('exactly three like clicks were sent, all with the next-video arrow, and the viewer was closed',await pg.evaluate(()=>clicks===3&&arrowClicks===3&&!document.querySelector('[data-e2e="browse-video-container"]')&&__loc.pathname==='/@dabijou'));
 check('live progress is written while the walk runs (for the panel and studio)',await pg.evaluate(()=>data.walk&&data.walk.id==='test'&&data.walk.acted===3&&/video/.test(data.walk.text)));
 ({r,pg}=await run(PROFILE,{dry:true}));check('preview walks the videos without clicking Like',r.preview&&r.count===3&&await pg.evaluate(()=>clicks===0));
 ({r}=await run(PROFILE,{perUser:1}));check('videos-per-profile of 1 stops after one like',r.performed&&r.count===1);
 ({r}=await run(PROFILE,{limit:5},{done:4}));check('the remaining task limit is respected',r.performed&&r.count===1);
 ({r}=await run(PROFILE,{},{room:2}));check('the remaining daily cap is respected',r.performed&&r.count===2);
 ({r}=await run(PROFILE,{perUser:10}));check('it stops at the last video when the arrow disappears',r.performed&&r.count===3&&/already liked/.test(r.message));
 // hashtag / discover page: videos by different authors, limited by the scan limit rather than videos-per-profile
 const TAG=page({path:'/discover/printify',vids:[{a:'ann',id:'501'},{a:'bob',id:'502'},{a:'cy',id:'503'},{a:'dee',id:'504'}]});
 ({r,pg}=await run(TAG,{mode:'hashtag',scanLimit:2},{username:undefined,label:'topic printify',url:'https://www.tiktok.com/discover/printify'}));
 check('a discover page is walked in place and stops at the scan limit',r.performed&&r.count===2&&/from topic printify/.test(r.message)&&await pg.evaluate(()=>clicks===2&&arrowClicks===1&&!document.querySelector('[data-e2e="browse-video-container"]')));
 // if TikTok's arrow button cannot be found, the keyboard's Down key is used instead
 ({r,pg}=await run(page({path:'/@dabijou',vids:[{a:'dabijou',id:'1'},{a:'dabijou',id:'2'},{a:'dabijou',id:'3'}],arrow:false,keyNav:true}),{perUser:3}));
 check('without the arrow button the Down key advances to the next video',r.performed&&r.count===3&&await pg.evaluate(()=>clicks===3&&arrowClicks===0));
 ({r}=await run(page({path:'/@dabijou',vids:[{a:'dabijou',id:'1'}]}),{}));check('a profile with a single video likes it and finishes',r.performed&&r.count===1);
 ({r}=await run(page({path:'/@dabijou',vids:[]}),{}));check('a profile with no videos is skipped politely',!r.performed&&/Skipped @dabijou/.test(r.message));

 // comments: typed in the open viewer, one comment per video
 ({r,pg}=await run(page({path:'/@dabijou',vids:[{a:'dabijou',id:'61'},{a:'dabijou',id:'62'},{a:'dabijou',id:'63'}]}),{action:'comment',perUser:2,comment:'Great!'}));
 check('comment walk posts one comment per video and moves on with the arrow',r.performed&&r.count===2&&/Commented on 2 videos/.test(r.message)&&await pg.evaluate(()=>posts.length===2&&posts[0].text==='Great!'&&arrowClicks===1));
 // TikTok closing the viewer while the first character is typed: the walk re-opens that video once and carries on
 ({r,pg}=await run(page({path:'/@dabijou',vids:[{a:'dabijou',id:'71'},{a:'dabijou',id:'72'}],glitch:true}),{action:'comment',perUser:2,comment:'Great!'}));
 check('if the comment box closes mid-typing the walk re-opens the video once and still posts exactly one comment per video',r.performed&&r.count===2&&await pg.evaluate(()=>glitched&&posts.length===2&&new Set(posts.map(p=>p.id)).size===2));

 // follow: press the author's Follow button in the open video (hashtag / discover page), never a suggestion's
 const FTAG=page({path:'/tag/printify',vids:[{a:'ann',id:'501'},{a:'bob',id:'502',followed:true},{a:'ann',id:'503'},{a:'cy',id:'504'},{a:'dee',id:'505'}]});
 const fstep={username:undefined,label:'#printify',url:'https://www.tiktok.com/tag/printify'};
 ({r,pg}=await run(FTAG,{action:'follow',mode:'hashtag',scanLimit:5,limit:10},fstep));
 check('follow on a hashtag presses each video author\'s Follow button in place (skipping an author already followed and a repeat) and never a suggestion\'s',r.performed&&r.count===3&&/Followed the authors of 3 videos from #printify/.test(r.message)&&await pg.evaluate(()=>JSON.stringify(follows)===JSON.stringify(['ann','cy','dee'])&&decoyClicks===0&&!document.querySelector('[data-e2e="browse-video-container"]')));
 ({r,pg}=await run(FTAG,{action:'follow',mode:'hashtag',scanLimit:5,limit:10,dry:true},fstep));check('follow preview checks authors without pressing Follow',r.preview&&r.count===3&&await pg.evaluate(()=>follows.length===0));
 ({r,pg}=await run(FTAG,{action:'follow',mode:'hashtag',scanLimit:5,limit:2},fstep));check('the task limit caps how many authors are followed',r.performed&&r.count===2&&await pg.evaluate(()=>JSON.stringify(follows)===JSON.stringify(['ann','cy'])));
 ({r,pg}=await run(FTAG,{action:'followlike',mode:'hashtag',scanLimit:4,limit:4},fstep));
 check('follow + like in ONE walk: every video is liked AND its author followed, counted separately, and the limit does not starve the like half',r.performed&&r.count===4&&r.likes===4&&r.follows===2&&await pg.evaluate(()=>clicks===4&&JSON.stringify(follows)===JSON.stringify(['ann','cy'])));
 console.log('\n'+passed+' walk checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
