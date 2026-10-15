globalThis.AuroraSelectors = {
 url(value){try{const u=new URL(value,'https://www.tiktok.com');return u.origin==='https://www.tiktok.com'?u:null;}catch{return null;}},
 profileName(value){const u=this.url(value);return u?.pathname.match(/^\/@([\w.]{1,30})\/?$/)?.[1]||null;},
 discoverSlug(value){const u=this.url(value);try{return u?decodeURIComponent(u.pathname.match(/^\/discover\/([^/]+)\/?$/)?.[1]||'')||null:null;}catch{return null;}},
 postURL(value){const u=this.url(value),m=u?.pathname.match(/^\/@([\w.]{1,30})\/(video|photo)\/(\d+)\/?$/);return m?`https://www.tiktok.com/@${m[1].toLowerCase()}/${m[2]}/${m[3]}`:null;},
 pageKey(value){const u=this.url(value);if(!u)return null;const post=this.postURL(value);if(post)return post.split('/').slice(-2).join(':');const tag=u.pathname.match(/^\/tag\/([^/]+)\/?$/);if(tag){try{return 'tag:'+decodeURIComponent(tag[1]).toLowerCase();}catch{return null;}}const path=u.pathname.replace(/\/$/,'').toLowerCase();return this.profileName(value)?'profile:'+path:path+u.search;},
 // The profile's own Following / Followers count. It is found through its "-count" sibling first, because TikTok's left menu also has a "Following" link (the feed of people you follow) that must never be clicked.
 listControl(root,source){
  if(!['followers','following'].includes(source))return null;
  const vis=e=>!!e&&e.getClientRects().length>0;
  const counted=[...root.querySelectorAll(`[data-e2e="${source}-count"]`)].filter(vis).map(c=>c.parentElement&&c.parentElement.querySelector(`[data-e2e="${source}"]`)).find(vis);
  if(counted)return counted;
  const outside=e=>!e.closest('nav,aside,[data-e2e*="nav"],[class*="SideNav"],[class*="NavContainer"]')&&!(e.tagName==='A'&&e.getAttribute('href')&&!/^\/@/.test(e.getAttribute('href')));
  return [...root.querySelectorAll(`[data-e2e="${source}"],button,[role="button"],a`)].find(e=>vis(e)&&outside(e)&&(e.getAttribute('data-e2e')===source||new RegExp(`\\b${source}\\b`,'i').test(e.getAttribute('aria-label')||e.textContent||'')))||null;
 }
};
