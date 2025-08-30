"use client";
import InlineEmbedCard from "@/components/InlineEmbedCard";

const TEST_URL = "https://news.yahoo.co.jp/pickup/6550701";

export default function DebugYahoo(){
  return (
    <main className="container" style={{padding:16}}>
      <h1 className="title">Yahoo!ニュース表示テスト</h1>
      <p>以下は Yahoo! ニュースのピックアップURLを、通常のページ表示カードでレンダリングした例です。</p>
      <InlineEmbedCard
        postId="debug-yahoo"
        title="Yahoo!ニュース（テスト）"
        comment="フォールバック（本文抜粋＋引用リンク）が表示されるはずです"
        tags={["ニュース"]}
        sourceUrl={TEST_URL}
        embedUrl={TEST_URL}
        kind="page"
        alwaysOpen
      />
    </main>
  );
}

