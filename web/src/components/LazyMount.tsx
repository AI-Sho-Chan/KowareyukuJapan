"use client";
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  rootMargin?: string;
  threshold?: number;
  minHeight?: number;
  children: React.ReactNode | (() => React.ReactNode);
};

export default function LazyMount({ rootMargin='100px', threshold=0.1, minHeight=200, children }: Props){
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const io = new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){ setVisible(true); io.disconnect(); }
    }, { root: null, rootMargin, threshold });
    io.observe(el);
    return ()=> io.disconnect();
  },[rootMargin, threshold]);

  return (
    <div ref={ref} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? (typeof children === 'function' ? (children as any)() : children) : null}
    </div>
  );
}


