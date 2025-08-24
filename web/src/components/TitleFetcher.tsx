"use client";

import { useEffect, useState } from "react";

export default function TitleFetcher({ url, fallback, onTitle }: { url: string; fallback: string; onTitle: (t: string)=>void; }){
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    let mounted = true;
    (async()=>{
      try{
        const r = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
        const j = await r.json();
        if(mounted && j?.meta?.title){ onTitle(j.meta.title as string); }
        if(mounted && (!j?.meta?.title)){
          const rr = await fetch(`/api/metadata-render?url=${encodeURIComponent(url)}`);
          const jj = await rr.json();
          if(jj?.title){ onTitle(jj.title as string); }
          if(mounted && !jj?.title){
            const r3 = await fetch(`/api/metadata-headless?url=${encodeURIComponent(url)}`);
            const j3 = await r3.json();
            if(j3?.title){ onTitle(j3.title as string); }
          }
        }
      }catch(_e){}
      finally{ setLoading(false); }
    })();
    return ()=>{ mounted=false; };
  },[url,onTitle]);
  return loading ? <span className="meta">{fallback}</span> : null;
}


