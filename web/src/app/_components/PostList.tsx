"use client";
import React from 'react';
import XEmbedCard from "@/components/XEmbedCard";
import YouTubeEmbedCard from "@/components/YouTubeEmbedCard";
import InstagramEmbedCard from "@/components/InstagramEmbedCard";
import TikTokEmbedCard from "@/components/TikTokEmbedCard";
import ThreadsEmbedCard from "@/components/ThreadsEmbedCard";
import NicoVideoEmbedCard from "@/components/NicoVideoEmbedCard";
import NoteEmbedCard from "@/components/NoteEmbedCard";
import InlineEmbedCard from "@/components/InlineEmbedCard";
import CardActions from "@/components/CardActions";
import LazyMount from "@/components/LazyMount";
import { FIXED_TAGS, formatHandle } from './constants';

type Post = {
  id: string;
  url?: string;
  media?: { type: "image" | "video"; id: string; url: string };
  title: string;
  comment?: string;
  handle?: string;
  tags?: string[];
  createdAt: number;
  ownerKey?: string;
};

const isYT = (u?: string) => !!u && /https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(u);
const isX  = (u?: string) => !!u && /https?:\/\/(x\.com|twitter\.com)\//i.test(u);
const isIG = (u?: string) => !!u && /https?:\/\/(www\.)?instagram\.com\//i.test(u);
const isTikTok = (u?: string) => !!u && /https?:\/\/www\.tiktok\.com\//i.test(u || '');
const isThreads = (u?: string) => !!u && /https?:\/\/(www\.)?threads\.net\//i.test(u || '');
const isNico = (u?: string) => !!u && /https?:\/\/(www\.)?nicovideo\.jp\//i.test(u || '');
const isNote = (u?: string) => !!u && /https?:\/\/(www\.)?note\.com\//i.test(u || '');

type Props = {
  posts: Post[];
  viewerKey: string;
  onChanged: () => Promise<void> | void;
};

export default function PostList({ posts, viewerKey, onChanged }: Props){
  async function updateTags(id: string, tags: string[]){
    await fetch(`/api/posts/${id}`, { method:'PATCH', headers:{'content-type':'application/json','x-owner-key': viewerKey }, body: JSON.stringify({ tags }) });
    await onChanged();
  }
  async function updateComment(id: string, comment: string){
    await fetch(`/api/posts/${id}`, { method:'PATCH', headers:{'content-type':'application/json','x-owner-key': viewerKey }, body: JSON.stringify({ comment }) });
    await onChanged();
  }
  async function removePost(id: string){
    if (!confirm(`この投稿(${id})を削除します。よろしいですか？`)) return;
    const r = await fetch(`/api/posts/${id}`, { method: 'DELETE', headers: { 'x-owner-key': viewerKey } });
    if (r.ok) await onChanged(); else alert('削除に失敗しました');
  }

  return (
    <section className="feed" id="feed">
      {posts.map((p) => {
        const selected = new Set(p.tags || []);
        const isOwner = !!viewerKey && !!(p as any).ownerKey && viewerKey === (p as any).ownerKey;

        const TagEditor = !isOwner ? null : (
          <details style={{marginTop:6}}>
            <summary style={{cursor:'pointer'}}>タグを編集</summary>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:6}}>
              {FIXED_TAGS.map(t=>{
                const checked = selected.has(t);
                return (
                  <label key={t} style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <input type="checkbox" defaultChecked={checked} onChange={(e)=>{
                      const next = new Set(selected);
                      if (e.currentTarget.checked) next.add(t); else next.delete(t);
                      updateTags(p.id, Array.from(next));
                    }} />
                    <span>#{t}</span>
                  </label>
                );
              })}
            </div>
          </details>
        );
        const OwnerActions = !isOwner ? null : (
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button className="btn" onClick={()=>{
              const next = prompt('コメントを編集', p.comment || '') ?? undefined;
              if (typeof next === 'string') updateComment(p.id, next);
            }}>コメントを編集</button>
            <button className="btn" onClick={()=>removePost(p.id)}>削除</button>
          </div>
        );
        const AdminHeader = (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <small style={{color:'var(--muted)'}}>管理番号: <code>{p.id}</code></small>
            <button className="btn" onClick={()=>removePost(p.id)}>削除</button>
          </div>
        );

        if (isX(p.url)) {
          return (
            <div key={p.id}>
              <XEmbedCard
                postId={p.id}
                title={p.title}
                comment={p.comment || ""}
                statusUrl={p.url!}
                handle={p.handle}
                tags={p.tags}
                createdAt={p.createdAt}
                adminHeader={AdminHeader}
              />
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        const commonMeta = (
          <div className="meta" style={{marginTop:8}}>
            <span className="handle">記録者 {formatHandle(p.handle)}</span>
            {p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}
            {p.createdAt ? <time style={{marginLeft:8}}>{new Date(p.createdAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time> : null}
          </div>
        );

        if (p.url && isYT(p.url)) {
          return (
            <div key={p.id}>
              <article className="card" data-post-id={p.id}>
                <div className="card-body">
                  {AdminHeader}
                  <h2 className="title">{p.title || (p.comment?.split('\n')?.[0] || '')}</h2>
                  <div className="embed" style={{marginTop:8}}>
                    <LazyMount minHeight={280}>{() => <YouTubeEmbedCard url={p.url!} />}</LazyMount>
                  </div>
                  {commonMeta}
                  <div className="comment-label">コメント</div>
                  <p className="comment">{p.comment || "(コメントなし)"}</p>
                  <CardActions title={p.title || (p.comment?.split('\n')?.[0] || '')} url={p.url!} />
                </div>
              </article>
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        if (p.url && isIG(p.url)){
          return (
            <div key={p.id}>
              <article className="card" data-post-id={p.id}>
                <div className="card-body">
                  {AdminHeader}
                  <h2 className="title">{p.title}</h2>
                  <div className="embed" style={{marginTop:8}}>
                    <LazyMount minHeight={300}>{() => <InstagramEmbedCard url={p.url!} />}</LazyMount>
                  </div>
                  {commonMeta}
                  <div className="comment-label">コメント</div>
                  <p className="comment">{p.comment || "(コメントなし)"}</p>
                  <CardActions title={p.title} url={p.url!} />
                </div>
              </article>
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        if (p.url && isTikTok(p.url)){
          return (
            <div key={p.id}>
              <article className="card" data-post-id={p.id}>
                <div className="card-body">
                  {AdminHeader}
                  <h2 className="title">{p.title}</h2>
                  <div className="embed" style={{marginTop:8}}>
                    <LazyMount minHeight={320}>{() => <TikTokEmbedCard url={p.url!} />}</LazyMount>
                  </div>
                  {commonMeta}
                  <div className="comment-label">コメント</div>
                  <p className="comment">{p.comment || "(コメントなし)"}</p>
                  <CardActions title={p.title} url={p.url!} />
                </div>
              </article>
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        if (p.url && isThreads(p.url)){
          return (
            <div key={p.id}>
              <article className="card" data-post-id={p.id}>
                <div className="card-body">
                  {AdminHeader}
                  <h2 className="title">{p.title}</h2>
                  <div className="embed" style={{marginTop:8}}>
                    <LazyMount minHeight={260}>{() => <ThreadsEmbedCard url={p.url!} />}</LazyMount>
                  </div>
                  {commonMeta}
                  <div className="comment-label">コメント</div>
                  <p className="comment">{p.comment || "(コメントなし)"}</p>
                  <CardActions title={p.title} url={p.url!} />
                </div>
              </article>
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        if (p.url && isNico(p.url)){
          return (
            <div key={p.id}>
              <article className="card" data-post-id={p.id}>
                <div className="card-body">
                  {AdminHeader}
                  <h2 className="title">{p.title}</h2>
                  <div className="embed" style={{marginTop:8}}>
                    <LazyMount minHeight={260}>{() => <NicoVideoEmbedCard url={p.url!} />}</LazyMount>
                  </div>
                  {commonMeta}
                  <div className="comment-label">コメント</div>
                  <p className="comment">{p.comment || "(コメントなし)"}</p>
                  <CardActions title={p.title} url={p.url!} />
                </div>
              </article>
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        if (p.url && isNote(p.url)){
          return (
            <div key={p.id}>
              <article className="card" data-post-id={p.id}>
                <div className="card-body">
                  {AdminHeader}
                  <h2 className="title">{p.title}</h2>
                  <div className="embed" style={{marginTop:8}}>
                    <LazyMount minHeight={260}>{() => <NoteEmbedCard url={p.url!} />}</LazyMount>
                  </div>
                  {commonMeta}
                  <div className="comment-label">コメント</div>
                  <p className="comment">{p.comment || "(コメントなし)"}</p>
                  <CardActions title={p.title} url={p.url!} />
                </div>
              </article>
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        if (p.media) {
          return (
            <div key={p.id}>
              <InlineEmbedCard
                postId={p.id}
                title={p.title}
                comment={p.comment || ""}
                tags={p.tags && p.tags.length ? p.tags : ["ユーザー投稿"]}
                sourceUrl={p.url || p.media.url}
                thumbnailUrl={p.media.type === 'image' ? p.media.url : undefined}
                embedUrl={p.media.url}
                kind={p.media.type}
                alwaysOpen
                createdAt={p.createdAt}
                handle={p.handle}
                adminHeader={AdminHeader}
              />
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        if (p.url) {
          return (
            <div key={p.id}>
              <InlineEmbedCard
                postId={p.id}
                title={p.title}
                comment={p.comment || ""}
                tags={p.tags && p.tags.length ? p.tags : ["リンク"]}
                sourceUrl={p.url}
                embedUrl={p.url}
                kind="page"
                alwaysOpen
                createdAt={p.createdAt}
                handle={p.handle}
                adminHeader={AdminHeader}
              />
              {TagEditor}
              {OwnerActions}
            </div>
          );
        }

        return null;
      })}
    </section>
  );
}
