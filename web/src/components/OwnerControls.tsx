"use client";
import { useEffect, useState } from 'react';

export default function OwnerControls({ postId, ownerKey, title, comment }: { postId: string; ownerKey?: string; title?: string; comment?: string }){
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  useEffect(()=>{ try { setViewerKey(localStorage.getItem('kj_owner')); } catch{} },[]);
  const isOwner = !!viewerKey && !!ownerKey && viewerKey === ownerKey;
  if (!isOwner) return null;
  return (
    <div style={{display:'flex', gap:8, marginTop:8}}>
      <button className="btn" onClick={async()=>{
        const newTitle = prompt('タイトルを編集', title || '') ?? null;
        const newComment = prompt('コメントを編集', comment || '') ?? null;
        if(newTitle===null && newComment===null) return;
        try{
          const body:any = {};
          if(newTitle!==null) body.title = newTitle;
          if(newComment!==null) body.comment = newComment;
          const res = await fetch(`/api/posts/${postId}`, { method:'PATCH', headers:{'content-type':'application/json','x-owner-key': viewerKey || ''}, body: JSON.stringify(body) });
          if(!res.ok){ alert('更新に失敗しました'); } else { location.reload(); }
        } catch { alert('更新に失敗しました'); }
      }}>編集</button>
      <button className="btn" onClick={async()=>{
        if(!confirm('この投稿を削除します。よろしいですか？')) return;
        try{
          const res = await fetch(`/api/posts/${postId}`, { method:'DELETE', headers:{ 'x-owner-key': viewerKey || '' } });
          if(res.ok){ alert('削除しました'); location.reload(); } else { alert('削除に失敗しました'); }
        } catch { alert('削除に失敗しました'); }
      }}>削除</button>
    </div>
  );
}

