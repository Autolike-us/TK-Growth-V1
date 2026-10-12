(()=>{
 const D=AuroraDOM,S=AuroraSelectors;let locked=false;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 function blocked(){const text=document.body.innerText;if(location.pathname.includes('/login')||document.querySelector('input[name="password"]'))throw Error('Sign in to TikTok, then resume.');if(/Try Again Later|We restrict certain activity|Action Blocked|Confirm it.s you|Help us confirm|challenge required|Too many attempts|You.re following too fast|You.re tapping too fast|Verify to continue|Drag the slider|Verify you are human/i.test(text))throw Error('TikTok requested verification or restricted this action. Task paused.');}
 async function active(id){blocked();const {job}=await chrome.storage.local.get('job');if(job?.id!==id||job.status!=='running')throw Error('Task stopped or paused.');}
 async function until(fn,id,ms=12000){for(let t=0;t<ms;t+=300){await active(id);const x=fn();if(x)return x;await wait(300);}return null;}
 async function collect(root,read,limit,id){
  const found=new Set();let stale=0;
  for(let i=0;i<20&&found.size<limit&&stale<3;i++){
   await active(id);const before=found.size;read().forEach(x=>found.add(x));stale=found.size===before?stale+1:0;
   if(found.size>=limit)break;
   const scroller=D.scrollContainer(root);
   if(scroller)scroller.scrollTop+=Math.max(300,scroller.clientHeight*0.8);
   else if(root.matches('[role="dialog"]'))break;
   else {const more=D.controls(root).find(b=>/^(Load more comments|View more comments)$/i.test(b.textContent.trim()));if(more)more.click();else window.scrollBy(0,Math.max(500,innerHeight*0.8));}
   await wait(650);
  }
  return [...found].slice(0,limit);
 }
 async function receipt(key,status){const {receipts={}}=await chrome.storage.local.get('receipts');receipts[key]={status,time:Date.now()};await chrome.storage.local.set({receipts});}
 async function perform(key,id,click,confirm,message){
  const {receipts={}}=await chrome.storage.local.get('receipts');
  if(receipts[key])return {message:`Skipped: this action was already ${receipts[key].status}. Check TikTok before creating another task.`};
  await active(id);await receipt(key,'attempted');await active(id);await click();
  const ok=await until(confirm,id,9000);
  if(!ok)throw Error('Action was sent but could not be confirmed. It will not be automatically repeated. Check TikTok.');
  await receipt(key,'confirmed');return {performed:true,message};
 }
 async function step(s,c,id){
  await active(id);
  if(!await until(()=>D.scope(),id,15000))throw Error('TikTok did not render this page. Check access and resume.');
  const root=D.scope();
  if(S.pageKey(location.href)!==S.pageKey(s.url))throw Error('TikTok changed targets. Nothing was submitted.');
  if(s.kind==='posts'){
   const read=()=>[...root.querySelectorAll('a[href]')].map(a=>S.postURL(a.href)).filter(Boolean);
   if(!await until(()=>read().length,id,15000))throw Error('No posts appeared. Use an accessible hashtag/profile; check the task tab.');
   const posts=await collect(root,read,c.mode==='hashtag'?c.scanLimit:c.perUser,id);
   return {posts,note:'Collected available posts within your scan limit.'};
  }
  if(s.kind==='users'){
   if(s.source==='commenters'){
    if(!await until(()=>D.commenters(root).length,id))throw Error('No rendered comment authors found. Open/load comments on the task post and resume.');
    return {users:await collect(root,()=>D.commenters(root),c.scanLimit,id),note:'Comment authors only; hidden comments are not accessible.'};
   }
   let dialog=D.listDialog(s.source);
   if(!dialog){const button=await until(()=>S.listControl(root,s.source),id);if(!button)throw Error(`Could not find the ${s.source} control. Open that list on the task tab and resume.`);button.click();dialog=await until(()=>D.listDialog(s.source),id);}
   if(!dialog)throw Error(`The ${s.source} dialog did not open. Open it manually and resume.`);
   if(!await until(()=>D.names(dialog).length,id))throw Error('The list is empty or TikTok did not expose accounts.');
   return {users:await collect(dialog,()=>D.names(dialog),c.scanLimit,id),note:'Collected available accounts within your scan limit.'};
  }
  if(s.kind==='author'){const author=await until(()=>D.author(root),id);if(!author)throw Error('Cannot identify this post author.');return {users:[author]};}
  const actor=D.actor();
  if(s.kind==='account'){
   const name=S.profileName(location.href)?.toLowerCase();if(name!==s.username)throw Error('Profile changed; refusing to act on a different account.');
   if(c.exclude.includes(name)||actor===name)return {message:'Skipped: own or excluded profile.'};
   const header=D.profileHeader(root);
   const title=await until(()=>header.querySelector('[data-e2e="user-title"]'),id,15000);if(!title||title.textContent.trim().replace(/^@/,'').toLowerCase()!==name)throw Error('Cannot verify the rendered profile. No account action sent.');
   await until(()=>D.button(header,'Follow')||D.button(header,'Follow back')||D.button(header,'Following')||D.button(header,'Requested')||D.button(header,'Friends')||D.button(header,'Edit profile'),id);
   if(D.button(header,'Edit profile'))return {message:'Skipped: your own profile.'};
   if(c.action==='follow'){
    if(D.button(header,'Following')||D.button(header,'Requested')||D.button(header,'Friends'))return {message:'Skipped: already following or requested.'};
    const button=D.button(header,'Follow')||D.button(header,'Follow back');if(!button)throw Error('Follow control unavailable.');
    if(c.dry)return {preview:true,message:`Preview: follow @${name}. No change made.`};
    if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
    return perform(`${actor}:follow:${name}:${id}`,id,()=>button.click(),()=>D.button(header,'Following')||D.button(header,'Requested')||D.button(header,'Friends'),`Followed/requested @${name}.`);
   }
   if(c.action!=='unfollow'||c.mode!=='users')throw Error('Unfollow requires an explicit username list.');
   const following=D.button(header,'Following')||D.button(header,'Friends');if(!following)return {message:'Skipped: not currently following.'};
   if(c.dry)return {preview:true,message:`Preview: unfollow @${name}. No change made.`};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
   return perform(`${actor}:unfollow:${name}:${id}`,id,async()=>{following.click();const next=await until(()=>D.button(header,'Follow')||D.button(header,'Follow back')||[...document.querySelectorAll('[role="dialog"]')].map(d=>D.button(d,'Unfollow')).find(Boolean),id);if(!next)throw Error('Unfollow outcome is uncertain. Check TikTok manually.');if(D.text(next)==='Unfollow'){await active(id);next.click();}},()=>D.button(header,'Follow')||D.button(header,'Follow back'),`Unfollowed @${name}.`);
  }
  if(s.kind!=='engage')throw Error('Unknown step. Create a new task.');
  const author=await until(()=>D.author(root),id);
  if(!author||author!==new URL(s.url).pathname.split('/')[1].slice(1).toLowerCase())throw Error('Cannot verify the video author. Nothing submitted.');
  if(c.exclude.includes(author))return {message:'Skipped: excluded post author.'};
  if(c.action==='like'){
   const button=await until(()=>D.likeButton(root),id);if(!button)throw Error('Cannot identify a unique video Like control.');
   const state=D.likeState(button);if(state===true)return {message:'Skipped: video already liked.'};
   if(state!==false)throw Error('Cannot read whether this video is liked. No click sent.');
   if(c.dry)return {preview:true,message:'Preview: eligible video like. No change made.'};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
   return perform(`${actor}:like:${S.pageKey(location.href)}:${id}`,id,()=>button.click(),()=>D.likeState(D.likeButton(root))===true,'Liked video.');
  }
  if(c.action==='comment'){
   const field=await until(()=>D.commentField(root),id);
   if(!field)return {message:'Skipped: comments are disabled or the comment field is unavailable.'};
   if(c.dry)return {preview:true,message:`Preview comment: ${c.comment}. Nothing posted.`};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
   const key=`${actor}:comment:${S.pageKey(location.href)}`;
   const {receipts={}}=await chrome.storage.local.get('receipts');if(receipts[key])return {message:'Skipped: Aurora already attempted a comment on this post. No duplicate sent.'};
   if(D.fieldText(field).trim())throw Error('The comment box already contains text. Clear it manually before resuming.');
   const ownComment=()=>D.commentRows(root).some(row=>D.names(row)[0]===actor&&row.textContent.includes(c.comment));
   if(ownComment())return {message:'Skipped: your comment is already visible.'};
   await active(id);D.fillComment(field,c.comment);
   const submit=await until(()=>D.commentSubmit(root),id,5000);
   if(!submit)throw Error('Comment prepared but Post control is unavailable. Nothing was submitted.');
   return perform(key,id,()=>submit.click(),()=>!D.fieldText(field).trim()&&ownComment(),'Posted your comment.');
  }
  throw Error('Unsupported post action.');
 }
 chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.action!=='step'||s.id!==chrome.runtime.id)return;if(locked){reply({wait:'Waiting for the current step.'});return;}locked=true;step(m.step,m.config,m.jobId).then(reply,e=>reply({error:e.message})).finally(()=>locked=false);return true;});
})();

