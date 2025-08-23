(function(){
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
      modal.setAttribute('aria-hidden','true');
      alert('削除要請を受け付けました。');
    });
  }

  // 共感のダミー加算
  document.querySelectorAll('[data-action="empathize"]').forEach(btn=>{
    btn.addEventListener('click',()=>{
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


