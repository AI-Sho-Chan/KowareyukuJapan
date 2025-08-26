import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function fixFeedUrls() {
  console.log('🔧 フィードURLを修正中...\n');

  const fixes = [
    {
      id: 'sankei-politics',
      name: '産経新聞 - 政治',
      oldUrl: 'https://www.sankei.com/rss/politics.xml',
      newUrl: 'https://www.sankei.com/arc/outboundfeeds/rss/category/politics/?outputType=xml'
    },
    {
      id: 'zakzak-news',
      name: '夕刊フジ ZAKZAK',
      oldUrl: 'https://www.zakzak.co.jp/rss/news/flash-n.xml',
      newUrl: 'https://www.zakzak.co.jp/rss.htm'
    },
    {
      id: 'epochtimes-japan',
      name: '大紀元時報',
      oldUrl: 'https://www.epochtimes.jp/rss',
      newUrl: 'https://www.epochtimes.jp/rss.xml'
    }
  ];

  for (const fix of fixes) {
    try {
      await db.execute({
        sql: `UPDATE feed_sources SET url = ?, error_count = 0 WHERE id = ?`,
        args: [fix.newUrl, fix.id]
      });
      console.log(`✅ ${fix.name}: URL修正完了`);
      console.log(`   旧: ${fix.oldUrl}`);
      console.log(`   新: ${fix.newUrl}\n`);
    } catch (error) {
      console.error(`❌ ${fix.name}: 修正失敗`, error);
    }
  }

  // YouTube/Xは別途API統合が必要なので一旦無効化
  const toDisable = ['x-kadota-ryusho'];
  
  for (const id of toDisable) {
    try {
      await db.execute({
        sql: `UPDATE feed_sources SET enabled = 0 WHERE id = ?`,
        args: [id]
      });
      console.log(`⏸️  ${id}: 一時無効化（API統合待ち）`);
    } catch (error) {
      console.error(`❌ ${id}: 無効化失敗`, error);
    }
  }

  console.log('\n✨ フィードURL修正完了！');
}

fixFeedUrls().catch(console.error);