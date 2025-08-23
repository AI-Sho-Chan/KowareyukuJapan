import { notFound } from "next/navigation";

export default function Post({ params }: { params: { id: string } }){
  const id = params.id;
  if(!id) return notFound();
  return (
    <main className="container post-detail" data-post-id={id}>
      <h1 className="title">地方祭りの中止、補助見直しの影響</h1>
      <div className="meta"><span className="handle">@hanako</span><time>2025/01/01</time><span className="tags">#地域コミュニティ・#長野</span></div>
      <div className="media"><img src="https://placehold.co/1200x675?text=OGP+Image" alt=""/></div>
      <p className="comment">支援が途切れ、長年の祭りが姿を消しつつある。</p>
      <div className="source">出典: <a href="#" rel="nofollow noopener" target="_blank">example.com/news/123</a></div>
      <div className="actions">
        <button className="btn primary" data-action="empathize">共感する <span className="count">12</span></button>
        <button className="btn" data-action="share">シェア</button>
        <button className="btn subtle" data-action="request-removal">削除要請</button>
      </div>
      <section className="policy-note"><p>特集に関する注意: 出典リンクの明示、個人特定情報のマスキング、属性に基づく一般化の禁止。</p></section>
      <div className="modal" id="removal-modal" aria-hidden="true" role="dialog" aria-labelledby="removal-title">
        <div className="modal-content">
          <h3 id="removal-title">削除要請</h3>
          <p className="modal-desc">理由を選択してください（1端末1回）。</p>
          <form>
            <label className="radio"><input type="radio" name="reason" value="誤情報"/> 誤情報の可能性</label>
            <label className="radio"><input type="radio" name="reason" value="権利侵害"/> 著作権/肖像権などの侵害</label>
            <label className="radio"><input type="radio" name="reason" value="個人情報"/> 個人情報の含有</label>
            <label className="radio"><input type="radio" name="reason" value="無関係"/> テーマと無関係</label>
            <div className="modal-actions">
              <button type="button" className="btn" data-action="modal-cancel">キャンセル</button>
              <button type="submit" className="btn primary" data-action="modal-submit">送信</button>
            </div>
          </form>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{__html:`(${clientJS.toString()})()`}} />
    </main>
  );
}

function clientJS(){
  function onceGuard(key: string){ const k=`kj_once_${key}`; if(localStorage.getItem(k)) return false; localStorage.setItem(k,'1'); return true; }
  const modal=document.getElementById('removal-modal');
  const opens=document.querySelectorAll('[data-action="request-removal"]');
  const cancel=document.querySelector('[data-action="modal-cancel"]');
  const submit=document.querySelector('[data-action="modal-submit"]');
  opens.forEach(b=>b.addEventListener('click',()=>modal?.setAttribute('aria-hidden','false')));
  cancel?.addEventListener('click',()=>modal?.setAttribute('aria-hidden','true'));
  submit?.addEventListener('click',(e)=>{
    e.preventDefault();
    const checked=modal?.querySelector('input[name="reason"]:checked');
    if(!checked){ alert('理由を選択してください。'); return; }
    const post=document.querySelector('[data-post-id]');
    const pid=post?post.getAttribute('data-post-id'):'unknown';
    if(!onceGuard(`removal_${pid}`)){ alert('この投稿への削除要請は既に送信済みです。'); }
    else { alert('削除要請を受け付けました。'); }
    modal?.setAttribute('aria-hidden','true');
  });
  document.querySelectorAll('[data-action="empathize"]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const post=btn.closest('[data-post-id]');
      const pid=post?post.getAttribute('data-post-id'):'unknown';
      if(!onceGuard(`empathize_${pid}`)){ alert('この投稿には既に共感済みです。'); return; }
      const count=btn.querySelector('.count'); if(!count) return; count.textContent=String((parseInt(count.textContent||'0',10)||0)+1);
    });
  });
}


