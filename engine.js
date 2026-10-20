globalThis.AuroraEngine = {
  profile(value) {
    let s=String(value||'').trim().replace(/^@/,'');
    if(/^https?:/.test(s))s=AuroraSelectors.profileName(s)||'';
    if(!/^[\w.]{1,30}$/.test(s)||!AuroraSelectors.profileName('/@'+s))throw Error('Enter valid TikTok usernames.');
    return s.toLowerCase();
  },
  config(input) {
    const c={...input,action:input.action||'like',dry:input.dry!==false};
    if(!['like','follow','followlike','unfollow','comment'].includes(c.action))throw Error('Choose an action.');
    for(const key of ['perUser','limit','delay','maxAge','scanLimit','dailyCap']) {
      c[key]=Number(c[key]??(key==='scanLimit'?50:0));const min=key==='maxAge'||key==='dailyCap'?0:key==='delay'?5:1;const max=key==='scanLimit'?500:key==='delay'?86400:key==='dailyCap'?10000:100000;
      if(!Number.isInteger(c[key])||c[key]<min||c[key]>max)throw Error(`Check ${key}: enter a whole number from ${min} to ${max}.`);
    }
    if(c.maxAge || c.videos)throw Error('Post age and skip-video filters are unavailable for TikTok.');
    if(!['users','posts','hashtag','followers','following','commenters','explore'].includes(c.mode))throw Error('Choose a supported TikTok discovery source.');
    c.exclude=String(c.exclude||'').split(/[\s,]+/).filter(Boolean).map(x=>this.profile(x));c.comment=String(c.comment||'').trim();
    c.commentMany=c.commentMany===true&&c.action==='comment';delete c.commentList;delete c.commentSeed;
    // "A different comment on each post": one comment per line, each checked on its own.
    if(c.commentMany){const list=[];for(const line of String(c.comment).split(/\r?\n/)){const t=line.replace(/\s+/g,' ').trim();if(t&&!list.some(x=>x.toLowerCase()===t.toLowerCase()))list.push(t);}if(list.length<2)throw Error('Different comments: write at least two comments, one per line, or untick “different comment on each post”.');if(list.some(x=>x.length>150))throw Error('Each comment must be 1–150 characters.');c.commentList=list;c.commentSeed=crypto.randomUUID();c.comment=list[0];}
    else if(c.action==='comment'&&(!c.comment||c.comment.length>150))throw Error('Enter your comment text (1–150 characters).');
    if(c.mode==='explore'&&c.action==='unfollow')throw Error('The Explore feed cannot be used to unfollow.');if(c.action==='unfollow'&&c.mode!=='users')throw Error('Unfollow uses your explicit profile/user list.');return c;
  },
  // Like/comment walk a profile in place: open its first video, act, press the next-video arrow, repeat (no per-video page loads).
  profileStep(name,c){return {label:'@'+name,kind:['follow','unfollow'].includes(c.action)?'account':'walk',url:`https://www.tiktok.com/@${name}`,username:name};},
  // "Follow + like": every profile gets a follow step and then a like step; each step carries its own action (act).
  profileSteps(name,c,only){if(c.action!=='followlike')return [this.profileStep(name,c)];const f={...this.profileStep(name,{action:'follow'}),act:'follow',label:'@'+name+' · follow'},l={...this.profileStep(name,{action:'like'}),act:'like',label:'@'+name+' · like'};return only==='follow'?[f]:only==='like'?[l]:[f,l];},
  // One post: like it / comment / follow its author. "Follow + like" does the like first, then follows the author.
  postSteps(url,c){const label='post '+String(AuroraSelectors.pageKey(url)||'').replace(/^post:/,'');if(c.action==='followlike')return [{kind:'engage',act:'like',url,label},{kind:'author',act:'follow',url,label}];return [{kind:c.action==='follow'?'author':'engage',url,label}];},
  initial(c) {
    const steps=this.initialOne(c);
    // "Follow + like" on a hashtag/explore page: ONE in-place walk that likes each video and follows its author.
    return c.action==='followlike'&&['hashtag','explore'].includes(c.mode)?steps.map(x=>x.kind==='walk'?{...x,act:'followlike',label:x.label+' · follow + like'}:x):steps;
  },
  initialOne(c) {
    // The Explore feed needs no target: walk its videos in place (TikTok's personal For You feed cannot be walked safely).
    if(c.mode==='explore')return [{label:'the Explore feed',kind:'walk',url:'https://www.tiktok.com/explore'}];
    const value=String(c.target||'').trim();if(!value)throw Error('Enter a target.');
    const post=s=>{const url=AuroraSelectors.postURL(s);if(!url)throw Error('Enter valid TikTok video or photo URLs.');return url;};
    switch(c.mode){
      case 'users':return [...new Set(value.split(/[\s,]+/).map(x=>this.profile(x)))].filter(x=>!c.exclude.includes(x)).flatMap(x=>this.profileSteps(x,c));
      case 'posts':return [...new Set(value.split(/[\s,]+/).map(post))].flatMap(url=>this.postSteps(url,c));
      case 'hashtag':{
        // A hashtag (#tag or /tag/ link) or a TikTok discover/search topic page. Like, comment and follow walk the page in place (follow presses the author's Follow button in the viewer).
        const walkable=['like','comment','follow','followlike'].includes(c.action);
        if(/^https?:/.test(value)){const slug=AuroraSelectors.discoverSlug(value);if(slug)return [{label:'topic '+slug,kind:walkable?'walk':'posts',url:'https://www.tiktok.com/discover/'+encodeURIComponent(slug)}];}
        let tag=value.replace(/^#/,'');if(/^https?:/.test(value)){const key=AuroraSelectors.pageKey(value);if(!key?.startsWith('tag:'))throw Error('Paste a hashtag or discover URL, or enter #tag.');tag=key.slice(4);}if(!/^[\p{L}\p{N}_]+$/u.test(tag))throw Error('Enter one hashtag or its TikTok URL.');return [{label:'#'+tag,kind:walkable?'walk':'posts',url:'https://www.tiktok.com/tag/'+encodeURIComponent(tag)}];}
      case 'followers':case 'following':{const who=this.profile(value);return [{label:c.mode+' of @'+who,kind:c.action==='follow'?'listfollow':'users',source:c.mode,username:who,url:`https://www.tiktok.com/@${who}`}];}
      case 'commenters':return [{label:c.mode+' of a post',kind:'users',source:c.mode,url:post(value)}];
      default:throw Error('Choose a discovery source.');
    }
  },
  expand(job,step,result){
    const c=job.config;job.seenUsers??=[];job.seen??=[];
    if(step.kind==='users'||step.kind==='author'){const users=[...new Set(result.users||[])].map(x=>this.profile(x)).filter(x=>!c.exclude.includes(x)&&!job.seenUsers.includes(x)).slice(0,c.scanLimit);job.seenUsers.push(...users);return users.flatMap(x=>this.profileSteps(x,c,step.kind==='author'?'follow':undefined));}
    if(step.kind==='posts'){const limit=c.mode==='hashtag'||c.mode==='explore'?c.scanLimit:c.perUser;const urls=[...new Set((result.posts||[]).map(x=>AuroraSelectors.postURL(x)).filter(Boolean))].filter(x=>!job.seen.includes(x)).slice(0,limit);job.seen.push(...urls);return urls.flatMap(url=>this.postSteps(url,c));}
    return [];
  }
};

