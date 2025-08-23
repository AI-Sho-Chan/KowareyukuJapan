import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="site-brand">
          <Link href="/" className="brand-title">壊れゆく日本Archives</Link>
          <p className="brand-copy">見過ごさない。記録する。伝える。</p>
        </div>
        <nav className="site-tabs" aria-label="フィード切替">
          <a className="tab active" href="#new">新着</a>
          <a className="tab" href="#trend">トレンド</a>
          <Link className="tab" href="/special">特集</Link>
        </nav>
      </header>
      <main className="container">
        <section className="notice special" id="special-banner">
          <div className="notice-title">特集: 外国人による犯罪・迷惑行為</div>
          <p className="notice-body">出典リンクの明示と、個人特定情報の配慮をお願いします。属性に基づく一般化・侮蔑はガイドラインで禁止されています。</p>
          <Link className="notice-link" href="/special">特集フィードを見る</Link>
        </section>
        <section className="feed" id="feed">
          <article className="card" data-post-id="post-001">
            <Link className="media" href="/post/post-001">
              <Image src="https://placehold.co/800x450?text=OGP+Image" alt="プレビュー画像" width={800} height={450} />
            </Link>
            <div className="card-body">
              <h2 className="title"><Link href="/post/post-001">地方祭りの中止、補助見直しの影響</Link></h2>
              <p className="comment">支援が途切れ、長年の祭りが姿を消しつつある。</p>
              <div className="meta"><span className="handle">@hanako</span><span className="tags">#地域コミュニティ・#都道府県: 長野</span></div>
              <div className="actions">
                <button className="btn primary" data-action="empathize">共感する <span className="count" aria-live="polite">12</span></button>
                <button className="btn" data-action="share">シェア</button>
                <button className="btn subtle" data-action="request-removal">削除要請</button>
              </div>
            </div>
          </article>
          <article className="card" data-post-id="post-002">
            <Link className="media" href="/post/post-002">
              <Image src="https://placehold.co/800x450?text=Video+Thumbnail" alt="プレビュー画像" width={800} height={450} />
            </Link>
            <div className="card-body">
              <h2 className="title"><Link href="/post/post-002">商店街の閉店が続く</Link></h2>
              <p className="comment">空き店舗が増え、地元の交流が薄れていく。</p>
              <div className="meta"><span className="handle">@taro</span><span className="tags">#産業/商店街・#都道府県: 兵庫</span></div>
              <div className="actions">
                <button className="btn primary" data-action="empathize">共感する <span className="count" aria-live="polite">88</span></button>
                <button className="btn" data-action="share">シェア</button>
                <button className="btn subtle" data-action="request-removal">削除要請</button>
              </div>
            </div>
          </article>
        </section>
      </main>
      <a className="fab" href="/compose" aria-label="投稿作成">＋投稿</a>
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
    </>
  );
}

function clientJS(){
  function onceGuard(key: string){
    const k = `kj_once_${key}`;
    if(localStorage.getItem(k)) return false;
    localStorage.setItem(k,'1');
    return true;
  }
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
      const count=btn.querySelector('.count');
      if(!count) return; count.textContent=String((parseInt(count.textContent||'0',10)||0)+1);
    });
  });
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>{}); }
}
