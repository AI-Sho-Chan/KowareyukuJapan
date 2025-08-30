"use client";
import React, { useState } from 'react';
import { FIXED_TAGS } from './constants';

type Props = { onSubmitted: () => Promise<void> | void };

export default function PostForm({ onSubmitted }: Props){
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  return (
    <section id="compose" className="card" style={{padding:12, marginTop:16}}>
      <h2 className="title">險倬鹸縺吶ｋ</h2>
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
          setUploading(true); setUploadMsg('繧｢繝・・繝ｭ繝ｼ繝我ｸｭ窶ｦ');
          const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement | null;
          const sel = fileInput?.files?.[0];
          if (sel && sel.type.startsWith('image/')) {
            const small = await downscaleImageFile(sel);
            if (small !== sel) { fd.delete('file'); fd.append('file', small, small.name); }
          }
          const r = await fetch('/api/posts', { method:'POST', body: fd, headers: { 'x-client-key': localStorage.getItem('kj_owner') || (localStorage.setItem('kj_owner', crypto.randomUUID()), localStorage.getItem('kj_owner') as string) } });
          const j = await r.json();
          if(j?.ok){
            setUploadMsg('繧｢繝・・繝ｭ繝ｼ繝牙ｮ御ｺ・);
            await onSubmitted();
            form.reset();
          } else {
            // NG繝ｯ繝ｼ繝峨お繝ｩ繝ｼ繧・ｻ悶・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
            const errorMsg = j?.error || j?.message || '繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆';
            setUploadMsg(errorMsg);
            alert(errorMsg);
          }
        } catch(error) {
          // 繧ｨ繝ｩ繝ｼ蜃ｦ逅・ｒ霑ｽ蜉
          console.error('謚慕ｨｿ繧ｨ繝ｩ繝ｼ:', error);
          setUploadMsg('繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆');
          alert('繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
        } finally {
          setUploading(false);
          // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺ｯ5遘貞ｾ後↓繧ｯ繝ｪ繧｢
          if(uploadMsg && !uploadMsg.includes('螳御ｺ・)) {
            setTimeout(() => setUploadMsg(null), 5000);
          }
        }
      }}>
        <label className="radio">URL
          <input name="url" type="url" placeholder="https://..." style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
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
        <div style={{marginTop:8}}>
          <div className="comment-label">繧ｫ繝・ざ繝ｪ繝ｼ・井ｻｻ諢上・隍・焚蜿ｯ・・/div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {FIXED_TAGS.map(t=> (
              <label key={t} className="radio" style={{display:'inline-flex',alignItems:'center',gap:6}}>
                <input type="checkbox" name="tag" value={t} /> <span>#{t}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-actions" style={{marginTop:12, display:'flex', alignItems:'center', gap:8}}>
          <button className="btn" type="button">荳区嶌縺・/button>
          <button className="btn primary" type="submit" disabled={uploading} aria-busy={uploading}>{uploading ? '繧｢繝・・繝ｭ繝ｼ繝我ｸｭ窶ｦ' : '險倬鹸'}</button>
          {uploadMsg ? <small style={{color: uploadMsg.includes('螳御ｺ・) ? 'var(--muted)' : 'crimson'}}>{uploadMsg}</small> : null}
        </div>
      </form>
    </section>
  );
}




