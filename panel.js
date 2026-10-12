(() => {
  if (document.getElementById('aurora-panel-host')) return;
  const host = document.createElement('div');
  host.id = 'aurora-panel-host';
  host.style.cssText = 'position:fixed;right:20px;bottom:80px;z-index:2147483647';
  const shadow = host.attachShadow({mode:'closed'});
  shadow.innerHTML = `<style>
    :host{all:initial;font:14px system-ui;color:#302442}*{box-sizing:border-box}
    button,input{font:inherit}button{cursor:pointer;border:1px solid #dacded;border-radius:12px;background:#f3edff;color:#402865;padding:10px 14px}button:disabled{opacity:.45;cursor:default}
    #toggle,.primary{background:#7043bd;color:white;border:0;box-shadow:0 5px 20px #25134426}
    section{width:min(340px,calc(100vw - 40px));padding:20px;background:#fffafd;border:1px solid #e3d5f1;border-radius:20px;box-shadow:0 12px 50px #22103233;margin-bottom:10px}
    [hidden]{display:none}h2{margin:0;font-size:22px}p{line-height:1.5;margin:12px 0}small{color:#685d76}
    input{width:100%;padding:11px;border:1px solid #d8cae8;border-radius:10px;margin:8px 0 12px;background:white;color:#302442}
    .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}#status{font-weight:600}#message{overflow-wrap:anywhere}label{display:block;margin-top:15px}
  </style><section hidden><h2>Aurora <small>1.0.0</small></h2>
    <p id="status">Ready</p><p id="message" role="status" aria-live="polite">Preview a profile to check discovery without sending likes.</p>
    <label for="target">Profile username</label><input id="target" placeholder="@username">
    <button id="preview" class="primary">Preview profile</button>
    <div class="row"><button id="pause">Pause</button><button id="resume">Resume</button><button id="stop">Stop</button></div>
    <p><small>Preview checks up to 3 posts. Allow 30 seconds between steps.</small></p><button id="studio">Open full studio</button>
  </section><button id="toggle" aria-expanded="false">✦ Aurora</button>`;
  document.documentElement.append(host);
  const $ = id => shadow.getElementById(id);
  const profile = AuroraSelectors.profileName(location.href);
  if (profile) $('target').value=profile;
  $('toggle').onclick=()=>{const section=shadow.querySelector('section');section.hidden=!section.hidden;$('toggle').setAttribute('aria-expanded',String(!section.hidden));};
  async function send(action, extra={}) {
    try {const result=await chrome.runtime.sendMessage({action,...extra});if(!result?.ok)throw Error(result?.error||'No response from Aurora.');if(result.message)$('message').textContent=result.message;}
    catch(error){$('message').textContent=error.message+' If Aurora was updated, refresh this TikTok tab.';}
  }
  $('preview').onclick=()=>send('previewProfile',{target:$('target').value});
  $('studio').onclick=()=>send('openStudio');
  for(const action of ['pause','resume','stop'])$(action).onclick=()=>send(action);
  function render(job){
    $('status').textContent=job?`${job.status} · ${job.done??job.liked??0} ${job.config?.dry?'previewed':job.config?.action||'actions'} · ${job.skipped||0} skipped`:'Ready';
    if(job?.message)$('message').textContent=job.message;
    $('preview').disabled=['running','paused'].includes(job?.status);
    $('pause').disabled=job?.status!=='running';$('resume').disabled=job?.status!=='paused';$('stop').disabled=!['running','paused'].includes(job?.status);
  }
  chrome.storage.local.get('job').then(({job})=>render(job)).catch(error=>$('message').textContent=error.message);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.job)render(changes.job.newValue);});
})();

