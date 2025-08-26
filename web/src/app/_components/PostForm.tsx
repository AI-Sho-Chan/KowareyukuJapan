"use client";
import React, { useState } from 'react';
import { FIXED_TAGS } from './constants';

type Props = { onSubmitted: () => Promise<void> | void };

export default function PostForm({ onSubmitted }: Props){
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  return (
    <section id="compose" className="card" style={{padding:12, marginTop:16}}>
      <h2 className="title">記録する</h2>
      <form method="post" encType="multipart/form-data" onSubmit={async (e)=>{
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const fd = new FormData(form);
        const checked = Array.from(form.querySelectorAll('input[name="tag"]:checked')) as HTMLInputElement[];
        checked.forEach(ch => fd.append('tags', ch.value));

        async function downscaleImageFile(file: File, maxW = 1600, maxH = 1600, quality = 0.85): Promise<File> {
          return new Promise((resolve) => {
            try {
              const img = new Image();
              const url = URL.createObjectURL(file);
              img.onload = () => {
                const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
                const w = Math.max(1, Math.round(img.width * ratio));
                const h = Math.max(1, Math.round(img.height * ratio));
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) { URL.revokeObjectURL(url); return resolve(file); }
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => {
                  URL.revokeObjectURL(url);
                  if (!blob) return resolve(file);
                  const out = new File([blob], (file.name || 'image').replace(/\.(png|jpe?g|webp|gif)$/i, '') + '.jpg', { type: 'image/jpeg' });
                  resolve(out);
                }, 'image/jpeg', quality);
              };
              img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
              img.src = url;
            } catch { resolve(file); }
          });
        }

        try{
          setUploading(true); setUploadMsg('アップロード中…');
          const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement | null;
          const sel = fileInput?.files?.[0];
          if (sel && sel.type.startsWith('image/')) {
            const small = await downscaleImageFile(sel);
            if (small !== sel) { fd.delete('file'); fd.append('file', small, small.name); }
          }
          const r = await fetch('/api/posts', { method:'POST', body: fd, headers: { 'x-client-key': localStorage.getItem('kj_owner') || (localStorage.setItem('kj_owner', crypto.randomUUID()), localStorage.getItem('kj_owner') as string) } });
          const j = await r.json();
          if(j?.ok){
            setUploadMsg('アップロード完了');
            await onSubmitted();
            form.reset();
          } else {
            setUploadMsg('アップロードに失敗しました');
            alert('投稿に失敗しました');
          }
        } finally {
          setUploading(false);
        }
      }}>
        <label className="radio">URL
          <input name="url" type="url" placeholder="https://..." style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
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
        <div style={{marginTop:8}}>
          <div className="comment-label">カテゴリー（任意・複数可）</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {FIXED_TAGS.map(t=> (
              <label key={t} className="radio" style={{display:'inline-flex',alignItems:'center',gap:6}}>
                <input type="checkbox" name="tag" value={t} /> <span>#{t}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-actions" style={{marginTop:12, display:'flex', alignItems:'center', gap:8}}>
          <button className="btn" type="button">下書き</button>
          <button className="btn primary" type="submit" disabled={uploading} aria-busy={uploading}>{uploading ? 'アップロード中…' : '記録'}</button>
          {uploadMsg ? <small style={{color: uploadMsg.includes('完了') ? 'var(--muted)' : 'crimson'}}>{uploadMsg}</small> : null}
        </div>
      </form>
    </section>
  );
}


