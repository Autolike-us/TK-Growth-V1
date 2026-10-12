importScripts('selectors.js','engine.js');
const base='https://www.tiktok.com/';
let busy=false;
// Errors raised before any click is sent; safe to retry while TikTok finishes rendering.
const RETRYABLE=/did not render this page|Cannot verify the rendered profile|No posts appeared|Cannot identify this post author|Cannot verify the video author|Could not find the|dialog did not open|Cannot identify a unique video Like control/;
// Pauses that need a person (not a one-click Resume).
const NEEDS_HUMAN=/verification|restricted|Sign in|Daily cap|interrupted|restarted|unknown/i;
const HISTORY_MAX=5000,RECEIPT_MAX_AGE=90*864e5;
const BADGE={running:['ON','#1fae7c'],paused:['!','#f43f5e'],completed:['✓','#7b5cf0']};
function badge(job){const b=BADGE[job?.status];chrome.action.setBadgeText({text:b?b[0]:''});if(b)chrome.action.setBadgeBackgroundColor({color:b[1]});}
const save=job=>{badge(job);return chrome.storage.local.set({job});};
chrome.storage.local.get('job').then(({job})=>badge(job));

// One status notification that is replaced, never stacked.
const NOTE='aurora-status';
async function notify(title,message,{resume=false}={}){
 const o={type:'basic',iconUrl:'icons/icon128.png',title,message:String(message||'').slice(0,250),priority:2,requireInteraction:true};
 try{await chrome.notifications.create(NOTE,resume?{...o,buttons:[{title:'Resume'},{title:'Open studio'}]}:o);}
 catch{try{await chrome.notifications.create(NOTE,o);}catch{}}
}
async function openStudio(){const url=chrome.runtime.getURL('dashboard.html');const [t]=await chrome.tabs.query({url});if(t){await chrome.tabs.update(t.id,{active:true});await chrome.windows.update(t.windowId,{focused:true});}else await chrome.tabs.create({url});}
chrome.notifications.onClicked.addListener(async id=>{chrome.notifications.clear(id);await openStudio();});
chrome.notifications.onButtonClicked.addListener(async(id,index)=>{chrome.notifications.clear(id);if(index===0){try{await resumeTask();}catch{await openStudio();}}else await openStudio();});

async function log(message,url){const {history=[]}=await chrome.storage.local.get('history');history.push({time:Date.now(),message,url});await chrome.storage.local.set({history:history.slice(-HISTORY_MAX)});}
async function schedule(job){await chrome.alarms.create('step',{when:Date.now()+Math.max(1000,(job.nextAt||0)-Date.now())});}
// Wait between steps: never shorter than the user's setting, plus 0-40% random extra so the rhythm is not mechanical.
const pause=job=>Math.round(job.config.delay*1000*(1+Math.random()*0.4));

// Optional daily cap on live actions (0 = off).
const today=()=>new Date().toDateString();
async function dailyCount(){const {daily}=await chrome.storage.local.get('daily');return daily?.day===today()?daily.count:0;}
async function bumpDaily(){await chrome.storage.local.set({daily:{day:today(),count:(await dailyCount())+1}});}

async function finish(job){
 job.status='completed';job.message=`Session complete: ${job.done||0} ${job.config.dry?'previewed':'actions confirmed'}, ${job.skipped||0} skipped.`;
 await save(job);await log(job.message);await chrome.alarms.clear('step');await notify('Aurora finished ✓',job.message);
}
// Send a step to the task tab; if the content script is missing (extension reloaded, tab opened earlier), attach it once and retry.
async function sendStep(job,step){
 const msg={action:'step',step,config:job.config,jobId:job.id};
 try{return await chrome.tabs.sendMessage(job.tabId,msg);}
 catch{
  try{await chrome.scripting.executeScript({target:{tabId:job.tabId},files:['selectors.js','dom.js','content.js']});return await chrome.tabs.sendMessage(job.tabId,msg);}
  catch{throw Error('TikTok content script is unavailable. Refresh the task tab and resume.');}
 }
}
async function tick(){
 if(busy)return;busy=true;
 try{
  const {job}=await chrome.storage.local.get('job');if(job?.status!=='running')return;
  if(!job.queue.length||(job.done||0)>=job.config.limit){await finish(job);return;}
  if(job.inFlight)throw Error('The last action was interrupted and its outcome is unknown. Check TikTok manually, stop this task, and create a new task for remaining targets.');
  if(Date.now()<(job.nextAt||0)){await schedule(job);return;}
  const step=job.queue[0];let tab;try{tab=await chrome.tabs.get(job.tabId);}catch{throw Error('The task tab was closed. Resume to open a new tab.');}
  if(tab.status!=='complete'){job.nextAt=Date.now()+2000;await save(job);await schedule(job);return;}
  if(AuroraSelectors.pageKey(tab.url)!==AuroraSelectors.pageKey(step.url)){
   if(job.navigation?.target===step.url&&job.navigation.attempts>=2)throw Error('TikTok redirected away from this target. Check the task tab and resume; Aurora stopped retrying the URL.');
   job.navigation={target:step.url,attempts:job.navigation?.target===step.url?job.navigation.attempts+1:1};job.message='Opening '+step.url;job.nextAt=Date.now()+2000;await save(job);await chrome.tabs.update(job.tabId,{url:step.url,active:true});await schedule(job);return;
  }
  const action=['account','engage'].includes(step.kind)&&!job.config.dry;
  if(action&&job.config.dailyCap&&await dailyCount()>=job.config.dailyCap)throw Error(`Daily cap reached (${job.config.dailyCap} actions today). Resume tomorrow or raise the cap in the studio.`);
  job.navigation=null;job.message='Reading TikTok: '+step.kind;await save(job);
  if(action){job.inFlight=true;await save(job);}
  const r=await sendStep(job,step);
  const latest=(await chrome.storage.local.get('job')).job;if(latest?.id!==job.id||latest.status!=='running')return;
  job.inFlight=false;await save(job);
  if(r?.error&&RETRYABLE.test(r.error)&&(job.retries||0)<3){job.retries=(job.retries||0)+1;job.message=`TikTok was still loading (${r.error}) Retrying ${job.retries}/3…`;job.nextAt=Date.now()+8000;await save(job);await schedule(job);return;}
  if(r?.error)throw Error(r.error);if(!r)throw Error('TikTok returned no result.');
  job.retries=0;
  if(r.wait){job.message=r.wait;job.nextAt=Date.now()+3000;await save(job);await schedule(job);return;}
  job.queue.shift();const more=AuroraEngine.expand(job,step,r);job.queue.unshift(...more);
  if(['users','posts','author'].includes(step.kind))job.message=`Discovered ${more.length} ${step.kind==='posts'?'posts':'profiles'}. ${r.note||''}`;
  else{if(r.performed||r.preview){job.done=(job.done||0)+1;if(r.performed){job.counts[job.config.action]++;await bumpDaily();}else job.previewed++;}else job.skipped++;job.liked=job.counts.like;job.message=r.message;}
  await log(job.message,step.url);
  if(!job.queue.length||(job.done||0)>=job.config.limit){await finish(job);return;}
  job.nextAt=Date.now()+pause(job);await save(job);await schedule(job);
 }catch(e){const {job}=await chrome.storage.local.get('job');if(job?.status==='running'){job.status='paused';job.message=e.message;await save(job);await chrome.alarms.clear('step');await log(e.message);await notify('Aurora paused — needs you',e.message+(NEEDS_HUMAN.test(e.message)?' Open Aurora to review.':' Press Resume to continue.'),{resume:!NEEDS_HUMAN.test(e.message)});}}
 finally{busy=false;}
}
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='step')tick();});
async function resumeTask(){
 const {job}=await chrome.storage.local.get('job');if(!job)throw Error('Create a task first.');
 if(job.inFlight)throw Error('Interrupted action: check TikTok manually, then stop this task and create a new task for remaining targets.');
 if(job.version!==2)throw Error('Stop the old-version task and create a new task.');if(job.status!=='paused')throw Error('Only paused tasks can resume.');
 try{await chrome.tabs.get(job.tabId);}catch{job.tabId=(await chrome.tabs.create({url:job.queue[0]?.url||base})).id;}
 job.status='running';job.navigation=null;job.retries=0;job.nextAt=Date.now()+1000;job.message='Resumed.';
 await save(job);await schedule(job);return{ok:true,message:job.message};
}
chrome.runtime.onMessage.addListener((m,s,respond)=>{
 const ownPage=[chrome.runtime.getURL('dashboard.html'),chrome.runtime.getURL('popup.html')].includes(s.url?.split(/[?#]/)[0]);
 const panel=s.tab&&s.url?.startsWith(base)&&['openStudio','previewProfile','pause','resume','stop'].includes(m.action);
 if(s.id!==chrome.runtime.id||(!ownPage&&!panel)){respond({ok:false,error:'Dashboard commands only.'});return;}
 (async()=>{
  if(m.action==='openStudio'){await chrome.tabs.create({url:chrome.runtime.getURL('dashboard.html')});return{ok:true};}
  if(m.action==='previewProfile')m={action:'start',config:{action:'like',mode:'users',target:m.target,perUser:3,limit:3,scanLimit:3,delay:30,maxAge:0,dailyCap:0,exclude:'',dry:true,videos:false}};
  if(m.action==='save'){await chrome.storage.local.set({config:m.config});return{ok:true};}
  if(m.action==='start'){
   if(busy)throw Error('A step is finishing. Try again shortly.');const old=(await chrome.storage.local.get('job')).job;if(['running','paused'].includes(old?.status))throw Error('Stop the current task first.');
   const config=AuroraEngine.config(m.config),queue=AuroraEngine.initial(config);if(!queue.length)throw Error('All targets are excluded.');
   await chrome.storage.local.set({config:m.config});const tab=await chrome.tabs.create({url:queue[0].url});
   const job={version:2,id:crypto.randomUUID(),config,queue,tabId:tab.id,status:'running',counts:{like:0,follow:0,unfollow:0,comment:0},done:0,liked:0,previewed:0,skipped:0,seen:[],seenUsers:[],nextAt:Date.now()+2000,message:`${config.dry?'Preview':'Live'} ${config.action} task started. Waiting for TikTok.`};
   await save(job);await log(job.message);await schedule(job);return{ok:true,message:job.message};
  }
  if(m.action==='resume')return resumeTask();
  const {job}=await chrome.storage.local.get('job');if(!job)throw Error('Create a task first.');
  if(m.action!=='pause'&&m.action!=='stop')throw Error('Unknown action.');
  job.status=m.action==='pause'?'paused':'stopped';job.message=job.status+'. A click already sent may finish.';await chrome.alarms.clear('step');
  await save(job);return{ok:true,message:job.message};
 })().then(respond,e=>respond({ok:false,error:e.message}));return true;
});
// Housekeeping: drop old like/follow/unfollow receipts. Comment receipts are kept forever (they prevent duplicate comments).
async function pruneReceipts(){
 const {receipts={}}=await chrome.storage.local.get('receipts');const cut=Date.now()-RECEIPT_MAX_AGE;let changed=false;
 for(const [k,v] of Object.entries(receipts))if(!k.includes(':comment:')&&(v.time||0)<cut){delete receipts[k];changed=true;}
 if(changed)await chrome.storage.local.set({receipts});
}
async function pauseOnRestart(){await pruneReceipts();const {job}=await chrome.storage.local.get('job');if(job&&['running','paused'].includes(job.status)){job.status='paused';job.message=job.version===2?'Browser or extension restarted. Check the task before resuming.':'Updated extension: stop the previous task and create a new one.';await save(job);await chrome.alarms.clear('step');await notify('Aurora paused — needs you',job.message);}}
chrome.runtime.onStartup.addListener(pauseOnRestart);
chrome.runtime.onInstalled.addListener(pauseOnRestart);
