const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const context=vm.createContext({URL});for(const file of ['selectors.js','engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);const S=context.AuroraSelectors,E=context.AuroraEngine;
const config=(extra={})=>E.config({action:'like',mode:'users',target:'@alice',perUser:3,limit:10,delay:30,maxAge:0,scanLimit:30,...extra});
test('profile inputs normalize TikTok usernames and links',()=>{for(const input of ['Alice','@Alice','https://www.tiktok.com/@Alice'])assert.equal(E.profile(input),'alice');});
test('reject foreign hosts, deceptive domains and Instagram paths',()=>{for(const x of ['https://evil.test/@alice','https://www.tiktok.com.evil.test/@alice','https://www.tiktok.com/alice','https://www.tiktok.com/@alice/video/123'])assert.throws(()=>E.profile(x));});
test('video URLs canonicalize and discard tracking',()=>assert.equal(S.postURL('https://www.tiktok.com/@Alice/video/123456?lang=en'),'https://www.tiktok.com/@alice/video/123456'));
test('reject short links and nonvideo links without guessing',()=>{for(const x of ['https://vm.tiktok.com/abc','https://www.tiktok.com/@alice','https://www.tiktok.com/@alice/video/abc'])assert.equal(S.postURL(x),null);});
test('video identity tolerates query and author case',()=>assert.equal(S.pageKey('https://www.tiktok.com/@Alice/video/123?x=1'),'video:123'));
test('preview defaults on; only explicit false enables live',()=>{assert.equal(config().dry,true);assert.equal(config({dry:false}).dry,false);assert.equal(config({dry:'false'}).dry,true);});
test('deduplicate and exclude profile targets',()=>{const q=E.initial(config({target:'@alice,Alice,@bob',exclude:'alice'}));assert.equal(q.length,1);assert.equal(q[0].url,'https://www.tiktok.com/@bob');});
test('follows route profiles to account steps',()=>assert.equal(E.initial(config({action:'follow'}))[0].kind,'account'));
test('like and comment on a profile plan an in-place walk step per profile',()=>{const steps=E.initial(config({target:'alice, bob'}));assert.equal(steps.map(x=>x.kind).join(),'walk,walk');assert.equal(steps[0].username,'alice');assert.equal(E.initial(config({action:'comment',comment:'Nice!'}))[0].kind,'walk');});
test('follow from a followers or following list is one in-place step; other actions still collect the accounts first',()=>{const f=E.initial(config({action:'follow',mode:'followers',target:'@alice'}))[0];assert.equal(f.kind,'listfollow');assert.equal(f.source,'followers');assert.equal(f.username,'alice');assert.equal(E.initial(config({action:'follow',mode:'following',target:'@alice'}))[0].source,'following');assert.equal(E.initial(config({action:'like',mode:'followers',target:'@alice'}))[0].kind,'users');});
test('follow on a profile still uses a one-click account step',()=>assert.equal(E.initial(config({action:'follow'}))[0].kind,'account'));
test('a hashtag or a discover page is walked in place for likes and comments',()=>{const tag=E.initial(config({mode:'hashtag',target:'#printify'}))[0];assert.equal(tag.kind,'walk');assert.equal(tag.url,'https://www.tiktok.com/tag/printify');const d=E.initial(config({mode:'hashtag',target:'https://www.tiktok.com/discover/printify-como-funciona-en-mexico'}))[0];assert.equal(d.kind,'walk');assert.equal(d.url,'https://www.tiktok.com/discover/printify-como-funciona-en-mexico');assert.equal(E.initial(config({mode:'hashtag',target:'#printify',action:'follow'}))[0].kind,'walk');});
test('unfollow requires explicit targets',()=>{for(const mode of ['posts','hashtag','followers','following','commenters'])assert.throws(()=>config({action:'unfollow',mode}));});
test('unsupported discovery and filters fail validation',()=>{for(const mode of ['location','likers','unknown'])assert.throws(()=>config({mode}));assert.throws(()=>config({maxAge:1}));assert.throws(()=>config({videos:true}));});
test('limits reject unsafe or noninteger values',()=>{for(const delay of [0,4,5.5,Infinity])assert.throws(()=>config({delay}));assert.throws(()=>config({limit:0}));assert.throws(()=>config({scanLimit:501}));});
test('comment requires 1 through 150 characters',()=>{assert.throws(()=>config({action:'comment',comment:''}));assert.throws(()=>config({action:'comment',comment:'x'.repeat(151)}));assert.equal(config({action:'comment',comment:' hello '}).comment,'hello');});
test('hashtag discovery uses TikTok tag page',()=>{for(const target of ['#travel','https://www.tiktok.com/tag/travel'])assert.equal(E.initial(config({mode:'hashtag',target}))[0].url,'https://www.tiktok.com/tag/travel');});
test('followers and following retain selected source',()=>{for(const mode of ['followers','following']){const step=E.initial(config({mode}))[0];assert.equal(step.source,mode);assert.equal(step.url,'https://www.tiktok.com/@alice');}});
test('commenter source takes full video URL',()=>assert.equal(E.initial(config({mode:'commenters',target:'https://www.tiktok.com/@alice/video/123'}))[0].source,'commenters'));
test('follow from videos resolves authors first',()=>assert.equal(E.initial(config({action:'follow',mode:'posts',target:'https://www.tiktok.com/@alice/video/123'}))[0].kind,'author'));
test('discovery expansion deduplicates and excludes users',()=>{const job={config:config({action:'follow',exclude:'bob'}),seenUsers:['alice']};const q=E.expand(job,{kind:'users'},{users:['alice','bob','charlie','charlie']});assert.equal(q.length,1);assert.equal(q[0].username,'charlie');});
test('post expansion excludes foreign URLs and prior videos',()=>{const job={config:config(),seen:['https://www.tiktok.com/@alice/video/1']};const q=E.expand(job,{kind:'posts'},{posts:['https://www.tiktok.com/@alice/video/1','https://evil.test/@alice/video/2','https://www.tiktok.com/@alice/video/3']});assert.equal(q.length,1);assert.equal(q[0].kind,'engage');});
test('profile identity tolerates tracking query params',()=>assert.equal(S.pageKey('https://www.tiktok.com/@Alice?lang=en'),S.pageKey('https://www.tiktok.com/@alice')));

test('daily cap is optional and validated',()=>{assert.equal(config().dailyCap,0);assert.equal(config({dailyCap:150}).dailyCap,150);assert.throws(()=>config({dailyCap:-1}));assert.throws(()=>config({dailyCap:10001}));});
test('photo posts are accepted and keep their own identity',()=>{assert.equal(S.postURL('https://www.tiktok.com/@Alice/photo/99?lang=en'),'https://www.tiktok.com/@alice/photo/99');assert.equal(S.pageKey('https://www.tiktok.com/@alice/photo/99'),'photo:99');assert.notEqual(S.pageKey('https://www.tiktok.com/@alice/photo/99'),S.pageKey('https://www.tiktok.com/@alice/video/99'));assert.equal(E.initial(config({mode:'posts',target:'https://www.tiktok.com/@alice/photo/99'}))[0].url,'https://www.tiktok.com/@alice/photo/99');});

// The full map of what every action does with every source, and where it points. If this changes, something now goes somewhere else.
test('every action x source plans the intended steps and addresses',()=>{
  const T={users:'@alice, bob',posts:'https://www.tiktok.com/@alice/video/111, https://www.tiktok.com/@bob/photo/222',hashtag:'#printify',discover:'https://www.tiktok.com/discover/printify-como-funciona-en-mexico',followers:'alice',following:'alice',commenters:'https://www.tiktok.com/@alice/video/111'};
  const plan=(action,key)=>{const mode=key==='discover'?'hashtag':key;try{return E.initial(config({action,mode,target:T[key],comment:'Nice!'})).map(x=>x.kind+(x.source?'('+x.source+')':'')+' '+x.url.replace('https://www.tiktok.com','')).join(' | ');}catch(e){return 'REJECTED';}};
  const WANT={
   like:{users:'walk /@alice | walk /@bob',posts:'engage /@alice/video/111 | engage /@bob/photo/222',hashtag:'walk /tag/printify',discover:'walk /discover/printify-como-funciona-en-mexico',followers:'users(followers) /@alice',following:'users(following) /@alice',commenters:'users(commenters) /@alice/video/111'},
   comment:{users:'walk /@alice | walk /@bob',posts:'engage /@alice/video/111 | engage /@bob/photo/222',hashtag:'walk /tag/printify',discover:'walk /discover/printify-como-funciona-en-mexico',followers:'users(followers) /@alice',following:'users(following) /@alice',commenters:'users(commenters) /@alice/video/111'},
   follow:{users:'account /@alice | account /@bob',posts:'author /@alice/video/111 | author /@bob/photo/222',hashtag:'walk /tag/printify',discover:'walk /discover/printify-como-funciona-en-mexico',followers:'listfollow(followers) /@alice',following:'listfollow(following) /@alice',commenters:'users(commenters) /@alice/video/111'},
   unfollow:{users:'account /@alice | account /@bob',posts:'REJECTED',hashtag:'REJECTED',discover:'REJECTED',followers:'REJECTED',following:'REJECTED',commenters:'REJECTED'}};
  for(const a of Object.keys(WANT))for(const k of Object.keys(WANT[a]))assert.equal(plan(a,k),WANT[a][k],a+' x '+k);
});

// ---- Follow + like
// results come from another realm (vm), so compare them as JSON
const same=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
const FL=(extra={})=>config({action:'followlike',...extra});
test('follow + like is an accepted action; unfollow rules are unchanged',()=>{assert.equal(FL().action,'followlike');assert.throws(()=>config({action:'unfollow',mode:'hashtag',target:'#x'}));});
test('follow + like on a profile list plans a follow step, then a like walk, for each profile',()=>{const s=E.initial(FL({target:'alice, bob'}));same(s.map(x=>[x.username,x.kind,x.act]),[['alice','account','follow'],['alice','walk','like'],['bob','account','follow'],['bob','walk','like']]);assert.ok(s.every(x=>x.url.startsWith('https://www.tiktok.com/@')));});
test('follow + like on direct video links likes each video, then follows its author',()=>{const s=E.initial(FL({mode:'posts',target:'https://www.tiktok.com/@alice/video/111, https://www.tiktok.com/@bob/photo/222'}));same(s.map(x=>[x.kind,x.act]),[['engage','like'],['author','follow'],['engage','like'],['author','follow']]);assert.equal(s[0].url,s[1].url);});
test('follow + like on a hashtag is ONE combined walk (likes each video and follows its author)',()=>{const s=E.initial(FL({mode:'hashtag',target:'#printify'}));same(s.map(x=>[x.kind,x.act,x.url]),[['walk','followlike','https://www.tiktok.com/tag/printify']]);});
test('follow + like on a discover page is also one combined walk',()=>{const s=E.initial(FL({mode:'hashtag',target:'https://www.tiktok.com/discover/printify-como-funciona-en-mexico'}));same(s.map(x=>[x.kind,x.act]),[['walk','followlike']]);});
test('follow + like on followers collects the accounts first, then follows and likes each',()=>{const c=FL({mode:'followers',target:'@alice'});const first=E.initial(c);assert.equal(first.length,1);assert.equal(first[0].kind,'users');const more=E.expand({config:c},first[0],{users:['carol','dave']});same(more.map(x=>[x.username,x.kind,x.act]),[['carol','account','follow'],['carol','walk','like'],['dave','account','follow'],['dave','walk','like']]);});
test('follow + like: the author of a video is followed only (the like was already done on the video)',()=>{const c=FL({mode:'posts',target:'https://www.tiktok.com/@alice/video/111'});const more=E.expand({config:c},{kind:'author'},{users:['alice']});same(more.map(x=>[x.username,x.kind,x.act]),[['alice','account','follow']]);});
test('the other actions still plan exactly one step per target (nothing carries an act)',()=>{for(const action of ['like','follow','comment'])assert.ok(E.initial(config({action,target:'alice',comment:'Nice!'})).every(x=>x.act===undefined));});

test('explore feed needs no target and plans a walk (follow + like = two walks)',()=>{
 const j=x=>JSON.parse(JSON.stringify(x));
 assert.deepEqual(j(E.initial(config({mode:'explore',target:''}))),[{label:'the Explore feed',kind:'walk',url:'https://www.tiktok.com/explore'}]);
 const fl=j(E.initial(config({action:'followlike',mode:'explore',target:''})));
 assert.deepEqual(fl.map(x=>x.act),['followlike']);
 assert.throws(()=>config({action:'unfollow',mode:'explore',target:''}));
});
