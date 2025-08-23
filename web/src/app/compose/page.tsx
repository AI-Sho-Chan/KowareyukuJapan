import Link from "next/link";

export default function Compose(){
  return (
    <main className="container">
      <h1 className="title">投稿作成</h1>
      <form className="card" style={{padding:12}}>
        <fieldset style={{border:'none',margin:0,padding:0}}>
          <legend className="meta">リンクまたはメディア</legend>
          <label className="radio" style={{marginTop:4}}>
            <input type="radio" name="mode" value="url" defaultChecked/> URLで投稿
          </label>
          <div style={{margin:'8px 0 12px'}}>
            <input type="url" placeholder="https://..." style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#1d1e21',color:'#fff'}}/>
            <p className="meta" style={{marginTop:6}}>可能ならOGP/oEmbedでプレビューされます</p>
          </div>
          <label className="radio">
            <input type="radio" name="mode" value="file"/> 画像/動画で投稿
          </label>
          <div style={{margin:'8px 0 12px',display:'none'}}>
            <input type="file" accept="image/*,video/*"/>
            <p className="meta" style={{marginTop:6}}>自作品のみ。自動で圧縮とサムネイル生成を行います</p>
          </div>
        </fieldset>
        <label className="radio" style={{marginTop:8}}>コメント（50字）
          <textarea rows={3} id="comment" data-char-limit={50} style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#1d1e21',color:'#fff'}}/>
          <div className="meta"><span id="comment-count">0</span>/50</div>
        </label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
          <label className="radio">テーマ
            <select style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#1d1e21',color:'#fff'}}>
              <option>伝統/文化</option>
              <option>地域コミュニティ</option>
              <option>家族/教育</option>
              <option>環境/風景</option>
              <option>産業/商店街</option>
              <option>治安/マナー</option>
              <option>公共空間/インフラ</option>
              <option>メディア/表現</option>
              <option>政治/制度</option>
              <option>価値観/習慣</option>
              <option>特集: 外国人による犯罪・迷惑行為</option>
            </select>
          </label>
          <label className="radio">都道府県
            <select style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#1d1e21',color:'#fff'}}>
              <option value="">未選択</option>
              <option>東京</option>
              <option>大阪</option>
              <option>神奈川</option>
              <option>北海道</option>
              <option>福岡</option>
            </select>
          </label>
        </div>
        <div className="modal-actions" style={{marginTop:14}}>
          <Link className="btn" href="/">キャンセル</Link>
          <button type="submit" className="btn primary">投稿</button>
        </div>
      </form>
      <script dangerouslySetInnerHTML={{__html:`(${clientJS.toString()})()`}} />
    </main>
  );
}

function clientJS(){
  const comment=document.getElementById('comment') as HTMLTextAreaElement | null;
  const counter=document.getElementById('comment-count');
  if(comment && counter){
    const limit=parseInt(comment.getAttribute('data-char-limit')||'50',10);
    const update=()=>{
      const v=comment.value||''; if(v.length>limit){ comment.value=v.slice(0,limit); }
      counter.textContent=String(comment.value.length);
    };
    comment.addEventListener('input',update); update();
  }
}


