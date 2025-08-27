import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function addSamplePosts() {
  console.log('Adding sample posts to database...');
  
  const db = createClient({
    url: process.env.TURSO_DB_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  });

  // Sample posts with real Japanese news topics
  const samplePosts = [
    {
      id: `post-${Date.now()}-1`,
      url: 'https://www.sankei.com/article/20250126-JXQZ5VWQXJLQZPQVQZXQZ/',
      title: '日本の少子化対策、新たな支援策を発表',
      comment: '政府が子育て世代への経済支援を拡充。実効性のある対策となるか注目される。',
      tags: JSON.stringify(['政治/制度', 'ニュース']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-2`,
      url: 'https://www.youtube.com/watch?v=abc123def456',
      title: '【解説】日本経済の現状と課題',
      comment: '専門家が日本経済の構造的問題について詳しく解説',
      tags: JSON.stringify(['動画', '経済']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-3`,
      url: 'https://x.com/newsaccount/status/1234567890',
      title: '外国人犯罪の増加に対する懸念',
      comment: '地域の安全を守るための対策が急務',
      tags: JSON.stringify(['治安/マナー', '外国人犯罪']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-4`,
      url: 'https://www.yomiuri.co.jp/national/20250126-OYT1T50123/',
      title: '日本の伝統文化継承に危機',
      comment: '後継者不足で多くの伝統技術が失われる恐れ',
      tags: JSON.stringify(['日本', '文化']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-5`,
      url: 'https://www3.nhk.or.jp/news/html/20250126/k10014123456.html',
      title: '中国人による土地買収が加速',
      comment: '北海道や沖縄で外国資本による土地取得が問題化',
      tags: JSON.stringify(['中国人', '政治/制度']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-6`,
      url: 'https://www.asahi.com/articles/ASS1T5QWQS1TUTFK001.html',
      title: '財務省の増税路線に批判集中',
      comment: '国民負担率の上昇に歯止めがかからない現状',
      tags: JSON.stringify(['財務省', '政治/制度']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-7`,
      url: 'https://www.zakzak.co.jp/article/20250126-ABC123XYZ/',
      title: 'クルド人問題、埼玉県川口市の現状',
      comment: '地域住民との軋轢が深刻化、早急な対策が必要',
      tags: JSON.stringify(['クルド人', '治安/マナー']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-8`,
      url: 'https://www.youtube.com/watch?v=xyz789abc123',
      title: '【特集】日本を守るために今できること',
      comment: '愛国心と実践的な行動について考える',
      tags: JSON.stringify(['動画', '特集', '日本']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-9`,
      url: 'https://x.com/politician/status/9876543210',
      title: '媚中政治家の実態が明らかに',
      comment: '国益を損なう政治家の言動に注意が必要',
      tags: JSON.stringify(['媚中政治家', '政治/制度']),
      owner_key: 'system',
    },
    {
      id: `post-${Date.now()}-10`,
      url: 'https://bunshun.jp/articles/-/12345',
      title: '帰化人政治家の増加と影響',
      comment: '日本の政治に与える影響について検証',
      tags: JSON.stringify(['帰化人政治家', '政治/制度']),
      owner_key: 'system',
    }
  ];

  try {
    // Clear existing demo posts
    await db.execute(`DELETE FROM posts WHERE owner_key = 'demo'`);
    console.log('Cleared demo posts');

    // Insert sample posts
    for (const post of samplePosts) {
      const metadata = {
        title: post.title,
        description: post.comment
      };
      
      await db.execute({
        sql: `INSERT INTO posts (id, url, comment, tags, owner_key, metadata_json, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          post.id,
          post.url,
          post.comment,
          post.tags,
          post.owner_key,
          JSON.stringify(metadata),
          Date.now()
        ]
      });
      console.log(`Added: ${post.title}`);
    }

    // Get total count
    const result = await db.execute('SELECT COUNT(*) as count FROM posts');
    console.log(`\n✅ Successfully added sample posts!`);
    console.log(`Total posts in database: ${result.rows[0].count}`);

  } catch (error) {
    console.error('Error adding sample posts:', error);
  }
}

addSamplePosts();