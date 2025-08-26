"use client";
import React from 'react';

type Props = {
  src: string;
  minHeight?: number;
  sandbox?: string;
  allow?: string;
  title?: string;
};

export default function EmbedFrame({ src, minHeight=400, sandbox='allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox', allow='clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen', title='embed' }: Props){
  return (
    <iframe
      src={src}
      title={title}
      referrerPolicy="origin-when-cross-origin"
      allow={allow}
      sandbox={sandbox}
      style={{ width:'100%', minHeight: `${minHeight}px`, border:'0' }}
      allowFullScreen
    />
  );
}


