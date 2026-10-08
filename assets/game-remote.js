/* Shared transport: retain the last valid token after timeouts; no answer fallback. */
(function(root){
  'use strict';
  const messages={PUZZLE_UNAVAILABLE:'Bu günün bulmacası henüz açılmadı.',INVALID_MOVE:'Bu hamle geçerli değil.',GAME_FINISHED:'Bu oyun zaten tamamlandı.',INVALID_SESSION:'Oyun kaydı doğrulanamadı. Kaydın silinmedi; lütfen yeniden dene.'};
  async function request(body,controller=new AbortController()){
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:controller.signal});
      if(response.status===429)throw new Error('Çok hızlı işlem yapıldı. Biraz bekleyip yeniden dene.');
      const data=await response.json();if(!response.ok||!data.token||!data.view)throw new Error(messages[data.error]||'Oyun sunucusuna ulaşılamadı. Tahminin kaybolmadı; yeniden dene.');
      return data;
    }catch(e){if(e.name==='AbortError'||e instanceof TypeError||e instanceof SyntaxError)throw new Error('Bağlantı kurulamadı. Tahminin kaybolmadı; yeniden dene.');throw e;}
    finally{clearTimeout(timer);}
  }
  const pending=new WeakSet(),prepared=new WeakMap();
  function discard(session){
    const entry=prepared.get(session);if(!entry)return;
    clearTimeout(entry.timer);entry.controller.abort();prepared.delete(session);
  }
  function start(entry){
    clearTimeout(entry.timer);
    if(!entry.promise){
      entry.promise=request({action:'move',token:entry.token,move:entry.move},entry.controller);
      entry.promise.catch(()=>{entry.failed=true;});
    }
    return entry.promise;
  }
  function candidate(session,move){
    return {token:session.token,move,key:JSON.stringify(move),controller:new AbortController(),promise:null,failed:false};
  }
  // The API is stateless: a prepared result is adopted only on explicit submission.
  function prepare(session,move){
    if(!session||pending.has(session))return;
    if(move==null){discard(session);return;}
    const previous=prepared.get(session),key=JSON.stringify(move);
    if(previous&&previous.token===session.token&&previous.key===key&&!previous.failed)return;
    discard(session);
    const entry=candidate(session,move);prepared.set(session,entry);
    entry.timer=setTimeout(()=>start(entry),100);
  }
  let feedbackId=0;
  function feedback(target){
    const id=++feedbackId;
    if(!document.getElementById('tp-move-style')){
      const style=document.createElement('style');style.id='tp-move-style';
      style.textContent='.tp-move-pending{animation:tp-move-wait .9s ease-in-out infinite!important}@keyframes tp-move-wait{0%,100%{opacity:1}50%{opacity:.65}}#tp-move-status{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10000;padding:8px 14px;border-radius:20px;background:#262626;color:#fff;font:500 13px system-ui;pointer-events:none;box-shadow:0 2px 10px #0002}#tp-move-status[hidden]{display:none}@media(prefers-reduced-motion:reduce){.tp-move-pending{animation:none!important;outline:2px solid currentColor;outline-offset:3px}}';
      document.head.append(style);
    }
    let status=document.getElementById('tp-move-status');
    if(!status){status=document.createElement('div');status.id='tp-move-status';status.hidden=true;status.setAttribute('role','status');document.body.append(status);}
    const oldBusy=target?.getAttribute('aria-busy');
    target?.classList.add('tp-move-pending');target?.setAttribute('aria-busy','true');
    const timer=setTimeout(()=>{if(id===feedbackId){status.textContent='Kontrol ediliyor…';status.hidden=false;}},180);
    return ()=>{
      clearTimeout(timer);if(id===feedbackId){status.hidden=true;status.textContent='';}target?.classList.remove('tp-move-pending');
      if(target){if(oldBusy===null)target.removeAttribute('aria-busy');else target.setAttribute('aria-busy',oldBusy);}
    };
  }
  root.TrPuzzleRemote=Object.freeze({
    prepare,
    async open(game,options={}){return request({action:options.token?'resume':'start',game,...options});},
    async move(session,move,target){
      if(pending.has(session))throw new Error('Önceki hamle kontrol ediliyor.');
      pending.add(session);
      let entry=prepared.get(session);
      if(!entry||entry.token!==session.token||entry.key!==JSON.stringify(move)||entry.failed){discard(session);entry=candidate(session,move);}
      prepared.delete(session);
      const stop=feedback(target);
      try{const next=await start(entry);Object.assign(session,next);return next.view;}
      finally{stop();pending.delete(session);}
    }
  });
})(window);

// Canonical /assets path is shared by the games on trpuzzle.com.
(function () {
  if (document.getElementById('tp-privacy-script')) return;
  const script = document.createElement('script');
  script.id = 'tp-privacy-script';
  script.src = '/assets/privacy-controls.js';
  script.defer = true;
  document.head.append(script);
})();
