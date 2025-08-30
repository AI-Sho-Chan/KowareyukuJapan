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
          <Link href="/" className="brand-title">螳医ｍ縺・span className="site-accent">譌･譛ｬ</span></Link>
          <p className="brand-copy" style={{fontSize:14}}>譌･譛ｬ縺ｮ縺溘ａ縺ｫ險倬鹸縺励∽ｼ昴∴繧・/p>
        </div>
        {/* 蜊倅ｸ繝壹・繧ｸ讒区・縺ｮ縺溘ａ繧ｿ繝悶・謦､蜴ｻ */}
      </header>
      <main className="container">
        <section className="feed" id="feed">
          <InlineEmbedCard
            postId="gd-91102"
            title="迴ｾ莉｣繝薙ず繝阪せ縺ｮ險倅ｺ・
            comment="譌･譛ｬ莠ｺ繧呈悽蠖薙↓闍ｦ縺励ａ縺ｦ縺・ｋ縺ｮ縺ｯ縲∵帆豐ｻ螳ｶ繧偵ｂ謫阪ｋ雋｡蜍咏怐縲りｲ｡蜍咏怐繧定ｧ｣菴薙○繧茨ｼ・
            tags={["謾ｿ豐ｻ/蛻ｶ蠎ｦ"]}
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
            title="蝓ｼ邇・荳蛾・ 蟆丞ｭｦ逕溘・縺埼・￡莠倶ｻｶ 荳ｭ蝗ｽ邀阪・驕玖ｻ｢謇九ｒ襍ｷ險ｴ"
            comment="蜃ｺ蜈ｸ: NHK 鬥夜・蝨上ル繝･繝ｼ繧ｹ"
            tags={["豐ｻ螳・繝槭リ繝ｼ","繝九Η繝ｼ繧ｹ"]}
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
            title="FNN繝励Λ繧､繝繧ｪ繝ｳ繝ｩ繧､繝ｳ縺ｮ繝九Η繝ｼ繧ｹ譏蜒・
            comment="繧ｵ繝繝阪う繝ｫ縺ｮ蜀咲函繝懊ち繝ｳ縺九ｉ蜍慕判繧貞・逕溘〒縺阪∪縺・
            tags={["蜍慕判","迚ｹ髮・]}
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
            comment="繧ゅ≧荳ｭ蝗ｽ莠ｺ縺ｯ荳蠕句・蝗ｽ遖∵ｭ｢縺ｧ縺・＞縺繧搾ｼ滓ｲ也ｸ・ｹ励▲蜿悶ｉ繧後ｋ蜑阪↓譌ｩ縺擾ｼ・
            statusUrl="https://x.com/La_Pla/status/1954718910584082931"
          />
        </section>
        {/* 邁｡譏捺兜遞ｿ繝輔か繝ｼ繝・・RL/逕ｻ蜒・蜍慕判縲∽ｻｻ諢上ち繧､繝医Ν/50蟄励さ繝｡繝ｳ繝・繝上Φ繝峨Ν・・*/}
        <section id="compose" className="card" style={{padding:12, marginTop:16}}>
          <h2 className="title">險倬鹸縺吶ｋ</h2>
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const res = await fetch('/api/posts', { method:'POST', body: fd, headers: { 'x-client-key': localStorage.getItem('kj_owner') || (localStorage.setItem('kj_owner', crypto.randomUUID()), localStorage.getItem('kj_owner') as string) } });
            const j = await res.json();
            if(j?.ok){ alert('謚慕ｨｿ縺励∪縺励◆・医ョ繝｢: 蜀崎ｪｭ縺ｿ霎ｼ縺ｿ縺ｧ蜿肴丐・・); location.reload(); } else { alert('謚慕ｨｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆'); }
          }}>
            <label className="radio">URL
              <input type="url" placeholder="https://..." style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
              <label className="radio">蜍慕判・冗判蜒上・繧｢繝・・繝ｭ繝ｼ繝会ｼ育ｫｯ譛ｫ縺九ｉ驕ｸ謚橸ｼ・
                <input name="file" type="file" accept="image/*,video/*" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'var(--muted)'}} />
              </label>
              <label className="radio">繧ｿ繧､繝医Ν・井ｻｻ諢擾ｼ・
                <input name="title" type="text" placeholder="莉ｻ諢上・繧ｿ繧､繝医Ν" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
              </label>
            </div>
            <label className="radio" style={{marginTop:8}}>繧ｳ繝｡繝ｳ繝茨ｼ・0蟄嶺ｸ企剞繝ｻ莉ｻ諢擾ｼ・
              <textarea name="comment" rows={2} maxLength={50} placeholder="縺ゅ↑縺溘・繧ｳ繝｡繝ｳ繝・ style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <label className="radio" style={{marginTop:8}}>繝上Φ繝峨Ν・井ｻｻ諢擾ｼ・
              <input name="handle" type="text" placeholder="@handle" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <div className="modal-actions" style={{marginTop:12}}>
              <button className="btn">荳区嶌縺・/button>
              <button className="btn primary" type="submit">險倬鹸</button>
            </div>
          </form>
        </section>
      </main>
      {/* 謚慕ｨｿ蟆守ｷ夲ｼ医ヵ繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ・・*/}
      <a className="fab" href="#compose" aria-label="險倬鹸菴懈・">・玖ｨ倬鹸</a>
    </>
  );
}

