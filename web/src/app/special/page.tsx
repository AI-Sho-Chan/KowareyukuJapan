import Link from "next/link";
import Image from "next/image";

export default function Special(){
  return (
    <main className="container">
      <section className="notice">
        <div className="notice-title">特集: 外国人による犯罪・迷惑行為</div>
        <p className="notice-body">出典リンク必須。個人特定情報はマスキングし、属性に基づく一般化や侮蔑は不可。</p>
      </section>
      <section className="feed">
        <article className="card" data-post-id="sp-001">
          <Link className="media" href="/post/sp-001"><Image src="https://placehold.co/800x450?text=OGP" alt="" width={800} height={450} /></Link>
          <div className="card-body">
            <h2 className="title"><Link href="/post/sp-001">公共空間での迷惑行為が問題化</Link></h2>
            <p className="comment">出典リンクで事実確認を。</p>
            <div className="meta"><span className="handle">@kiji</span><span className="tags">#治安/マナー・#東京</span></div>
            <div className="actions">
              <button className="btn primary" data-action="empathize">共感する <span className="count">3</span></button>
              <button className="btn" data-action="share">シェア</button>
              <button className="btn subtle" data-action="request-removal">削除要請</button>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}


