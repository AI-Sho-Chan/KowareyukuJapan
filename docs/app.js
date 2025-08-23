(function(){
  // 1端末1回の簡易ガード（ローカルストレージ）
  function onceGuard(key){
    const k = `kj_once_${key}`;
    if(localStorage.getItem(k)) return false;
    localStorage.setItem(k,'1');
    return true;
  }

  // 文字数カウント
  const comment = document.getElementById('comment');
  const counter = document.getElementById('comment-count');
  if(comment && counter){
    const limit = parseInt(comment.getAttribute('data-char-limit')||'50',10);
    const update = ()=>{
      const v = comment.value||'';
      if(v.length>limit){
        comment.value = v.slice(0,limit);
      }
      counter.textContent = String(comment.value.length);
    };
    comment.addEventListener('input',update);
    update();
  }
  const modal = document.getElementById('removal-modal');
  const openButtons = document.querySelectorAll('[data-action="request-removal"]');
  const cancel = document.querySelector('[data-action="modal-cancel"]');
  const submit = document.querySelector('[data-action="modal-submit"]');

  openButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!modal) return;
      modal.setAttribute('aria-hidden','false');
    });
  });
  if(cancel){
    cancel.addEventListener('click',()=>{
      if(!modal) return;
      modal.setAttribute('aria-hidden','true');
    });
  }
  if(submit){
    submit.addEventListener('click',(e)=>{
      e.preventDefault();
      const checked = modal.querySelector('input[name="reason"]:checked');
      if(!checked){
        alert('理由を選択してください。');
        return;
      }
      const post = document.querySelector('[data-post-id]');
      const pid = post ? post.getAttribute('data-post-id') : 'unknown';
      if(!onceGuard(`removal_${pid}`)){
        alert('この投稿への削除要請は既に送信済みです。');
      }else{
        alert('削除要請を受け付けました。');
      }
      modal.setAttribute('aria-hidden','true');
    });
  }

  // 共感のダミー加算
  document.querySelectorAll('[data-action="empathize"]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const post = btn.closest('[data-post-id]');
      const pid = post ? post.getAttribute('data-post-id') : 'unknown';
      if(!onceGuard(`empathize_${pid}`)){
        alert('この投稿には既に共感済みです。');
        return;
      }
      const count = btn.querySelector('.count');
      if(!count) return;
      const n = parseInt(count.textContent||'0',10) || 0;
      count.textContent = String(n+1);
    });
  });

  // シェアのダミー
  document.querySelectorAll('[data-action="share"]').forEach(btn=>{
    btn.addEventListener('click', async()=>{
      try{
        if(navigator.share){
          await navigator.share({title: document.title, url: location.href});
        }else{
          await navigator.clipboard.writeText(location.href);
          alert('URLをコピーしました');
        }
      }catch(_e){/* noop */}
    });
  });
})();


