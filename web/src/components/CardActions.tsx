"use client";
import React from 'react';

type Props = { title: string; url: string };

export default function CardActions({ title, url }: Props){
  return (
    <div className="actions" style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
      <button className="btn primary" onClick={()=>alert('共感しました（デモ）')}>共感する</button>
      <button className="btn" onClick={async()=>{
        try{
          if((navigator as any).share){ await (navigator as any).share({ title, url }); }
          else { await navigator.clipboard.writeText(url); alert('URLをコピーしました'); }
        }catch{}
      }}>シェア</button>
      <a className="btn source-link" href={url} target="_blank" rel="noopener noreferrer">引用元へ</a>
    </div>
  );
}


