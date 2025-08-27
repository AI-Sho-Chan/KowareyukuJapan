"use client";
import Link from "next/link";
import Image from "next/image";
import InlineEmbedCard from "@/components/InlineEmbedCard";
import XEmbedCard from "@/components/XEmbedCard";
import TitleFetcher from "@/components/TitleFetcher";

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="site-brand">
          <Link href="/" className="brand-title">守ろう<span className="site-accent">JAPAN</span></Link>
          <p className="brand-copy" style={{fontSize:14}}>日本のために記録し、伝える</p>
        </div>
        {/* 単一ページ構成のためタブは撤去 */}
      </header>
      <main className="container">
        <section className="feed" id="feed">
          <InlineEmbedCard
            postId="gd-91102"
            title="現代ビジネスの記事"
            comment="日本人を本当に苦しめているのは、政治家をも操る財務省。財務省を解体せよ！"
            tags={["政治/制度"]}
            sourceUrl="https://gendai.media/articles/-/91102"
            thumbnailUrl="https://placehold.co/800x450?text=NEWS+OGP"
            embedUrl="https://gendai.media/articles/-/91102"
            kind="page"
            alwaysOpen
            createdAt={Date.now()}
          />
          <TitleFetcher url="https://gendai.media/articles/-/91102" fallback="" onTitle={(t)=>{
            const el = document.querySelector('[data-post-id="gd-91102"] .title');
            if(el) el.textContent = t;
          }} />
          <InlineEmbedCard
            postId="nhk-001"
            title="埼玉 三郷 小学生ひき逃げ事件 中国籍の運転手を起訴"
            comment="出典: NHK 首都圏ニュース"
            tags={["治安/マナー","ニュース"]}
            sourceUrl="https://www3.nhk.or.jp/shutoken-news/20250606/1000118293.html"
            thumbnailUrl="https://placehold.co/800x450?text=NHK+NEWS"
            embedUrl="https://www3.nhk.or.jp/shutoken-news/20250606/1000118293.html"
            kind="page"
            alwaysOpen
            createdAt={Date.now()}
          />
          <TitleFetcher url="https://www3.nhk.or.jp/shutoken-news/20250606/1000118293.html" fallback="" onTitle={(t)=>{
            const el = document.querySelector('[data-post-id="nhk-001"] .title');
            if(el) el.textContent = t;
          }} />
          <InlineEmbedCard
            postId="yt-001"
            title="FNNプライムオンラインのニュース映像"
            comment="サムネイルの再生ボタンから動画を再生できます"
            tags={["動画","特集"]}
            sourceUrl="https://www.youtube.com/watch?v=HKPfestn2iY"
            thumbnailUrl="https://img.youtube.com/vi/HKPfestn2iY/hqdefault.jpg"
            embedUrl="https://www.youtube.com/embed/HKPfestn2iY"
            kind="youtube"
            alwaysOpen
            createdAt={Date.now()}
          />
          <TitleFetcher url="https://www.youtube.com/watch?v=HKPfestn2iY" fallback="" onTitle={(t)=>{
            const el = document.querySelector('[data-post-id="yt-001"] .title');
            if(el) el.textContent = t;
          }} />
          <XEmbedCard
            postId="tw-001"
            comment="もう中国人は一律入国禁止でいいだろ？沖縄乗っ取られる前に早く！"
            statusUrl="https://x.com/La_Pla/status/1954718910584082931"
          />
        </section>
        {/* 簡易投稿フォーム（URL/画像/動画、任意タイトル/50字コメント/ハンドル） */}
        <section id="compose" className="card" style={{padding:12, marginTop:16}}>
          <h2 className="title">記録する</h2>
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const res = await fetch('/api/posts', { method:'POST', body: fd, headers: { 'x-client-key': localStorage.getItem('kj_owner') || (localStorage.setItem('kj_owner', crypto.randomUUID()), localStorage.getItem('kj_owner') as string) } });
            const j = await res.json();
            if(j?.ok){ alert('投稿しました（デモ: 再読み込みで反映）'); location.reload(); } else { alert('投稿に失敗しました'); }
          }}>
            <label className="radio">URL
              <input type="url" placeholder="https://..." style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
              <label className="radio">動画／画像のアップロード（端末から選択）
                <input name="file" type="file" accept="image/*,video/*" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'var(--muted)'}} />
              </label>
              <label className="radio">タイトル（任意）
                <input name="title" type="text" placeholder="任意のタイトル" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
              </label>
            </div>
            <label className="radio" style={{marginTop:8}}>コメント（50字上限・任意）
              <textarea name="comment" rows={2} maxLength={50} placeholder="あなたのコメント" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <label className="radio" style={{marginTop:8}}>ハンドル（任意）
              <input name="handle" type="text" placeholder="@handle" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <div className="modal-actions" style={{marginTop:12}}>
              <button className="btn">下書き</button>
              <button className="btn primary" type="submit">記録</button>
            </div>
          </form>
        </section>
      </main>
      {/* 投稿導線（フローティング） */}
      <a className="fab" href="#compose" aria-label="記録作成">＋記録</a>
    </>
  );
}
