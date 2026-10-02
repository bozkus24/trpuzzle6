/* Shared transport: retain the last valid token after timeouts; no answer fallback. */
(function(root){
  'use strict';
  const messages={PUZZLE_UNAVAILABLE:'Bu günün bulmacası henüz açılmadı.',INVALID_MOVE:'Bu hamle geçerli değil.',GAME_FINISHED:'Bu oyun zaten tamamlandı.',INVALID_SESSION:'Oyun kaydı doğrulanamadı. Kaydın silinmedi; lütfen yeniden dene.'};
  async function request(body){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:controller.signal});
      if(response.status===429)throw new Error('Çok hızlı işlem yapıldı. Biraz bekleyip yeniden dene.');
      const data=await response.json();if(!response.ok||!data.token||!data.view)throw new Error(messages[data.error]||'Oyun sunucusuna ulaşılamadı. Tahminin kaybolmadı; yeniden dene.');
      return data;
    }catch(e){if(e.name==='AbortError'||e instanceof TypeError||e instanceof SyntaxError)throw new Error('Bağlantı kurulamadı. Tahminin kaybolmadı; yeniden dene.');throw e;}
    finally{clearTimeout(timer);}
  }
  const pending=new WeakSet();
  root.TrPuzzleRemote=Object.freeze({
    async open(game,options={}){return request({action:options.token?'resume':'start',game,...options});},
    async move(session,move){
      if(pending.has(session))throw new Error('Önceki hamle kontrol ediliyor.');
      pending.add(session);
      try{const next=await request({action:'move',token:session.token,move});Object.assign(session,next);return next.view;}
      finally{pending.delete(session);}
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
