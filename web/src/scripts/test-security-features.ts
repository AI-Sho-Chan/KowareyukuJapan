import { NGWordFilterV2 } from '../lib/security/ngword-filter-v2';

console.log('🔒 Testing Security Features...\n');

// 1. NGWordFilterV2のテスト
console.log('1. Testing NGWordFilterV2:');
console.log('─'.repeat(50));

const testCases = [
  // サイトへの攻撃
  {
    text: 'このkowareyukujapanはクソサイトだ',
    expected: { blocked: true, type: 'site_attack' },
    description: 'サイト攻撃',
  },
  {
    text: '管理人死ね',
    expected: { blocked: true, type: 'site_attack' },
    description: 'サイト管理者攻撃',
  },
  
  // 反日・左翼攻撃
  {
    text: 'ジャップは戦犯国',
    expected: { blocked: true, type: 'anti_japan' },
    description: '反日攻撃',
  },
  {
    text: 'ネトウヨは差別主義者',
    expected: { blocked: true, type: 'anti_japan' },
    description: '保守攻撃',
  },
  {
    text: '天皇死ね',
    expected: { blocked: true, type: 'anti_japan' },
    description: '皇室攻撃',
  },
  
  // 中国語・韓国語
  {
    text: '你好，我是中国人',
    expected: { blocked: true, type: 'chinese' },
    description: '中国語',
  },
  {
    text: '안녕하세요 한국입니다',
    expected: { blocked: true, type: 'korean' },
    description: '韓国語',
  },
  
  // 警告レベル（ブロックされない）
  {
    text: 'テロについてのニュース',
    expected: { blocked: false, warning: true },
    description: '警告ワード（テロ）',
  },
  {
    text: '爆破事件の報道',
    expected: { blocked: false, warning: true },
    description: '警告ワード（爆破）',
  },
  
  // 正常なテキスト
  {
    text: '日本の伝統文化は素晴らしい',
    expected: { blocked: false, warning: false },
    description: '正常（愛国的）',
  },
  {
    text: '政府の政策について議論しましょう',
    expected: { blocked: false, warning: false },
    description: '正常（政治議論）',
  },
  
  // ハンドルネームチェック
  {
    text: '管理人',
    options: { checkHandle: true },
    expected: { blocked: true, type: 'handle' },
    description: '不適切なハンドル（管理人）',
  },
  {
    text: 'ネトウヨ殲滅',
    options: { checkHandle: true },
    expected: { blocked: true, type: 'handle' },
    description: '不適切なハンドル（攻撃的）',
  },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = NGWordFilterV2.check(testCase.text, testCase.options);
  const isExpectedBlock = result.isBlocked === testCase.expected.blocked;
  const hasExpectedWarning = testCase.expected.warning !== undefined 
    ? result.hasWarning === testCase.expected.warning 
    : true;
  
  const success = isExpectedBlock && hasExpectedWarning;
  
  if (success) {
    console.log(`✅ ${testCase.description}`);
    console.log(`   Input: "${testCase.text.substring(0, 30)}..."`);
    console.log(`   Result: Blocked=${result.isBlocked}, Warning=${result.hasWarning}`);
    if (result.detectedWords.length > 0) {
      console.log(`   Detected: ${result.detectedWords.join(', ')}`);
    }
    if (result.blockedLanguages.length > 0) {
      console.log(`   Languages: ${result.blockedLanguages.join(', ')}`);
    }
    passed++;
  } else {
    console.log(`❌ ${testCase.description}`);
    console.log(`   Input: "${testCase.text}"`);
    console.log(`   Expected: Blocked=${testCase.expected.blocked}`);
    console.log(`   Got: Blocked=${result.isBlocked}, Warning=${result.hasWarning}`);
    failed++;
  }
  console.log('');
}

// 2. AI/Bot検出テスト
console.log('\n2. Testing AI/Bot Detection:');
console.log('─'.repeat(50));

const aiTestCases = [
  {
    text: `申し訳ございません。お手伝いできます。
まず、以下のように説明します。
次に、詳細を確認します。
最後に、結論として申し上げます。`,
    expected: { isAI: true },
    description: 'AI生成テキスト（典型的）',
  },
  {
    text: '今日は暑いね。ビール飲みたい。',
    expected: { isAI: false },
    description: '人間らしいテキスト',
  },
];

for (const testCase of aiTestCases) {
  const result = NGWordFilterV2.detectAIGenerated(testCase.text);
  const success = result.isAI === testCase.expected.isAI;
  
  if (success) {
    console.log(`✅ ${testCase.description}`);
    console.log(`   AI Detection: ${result.isAI} (confidence: ${result.confidence}%)`);
    if (result.indicators.length > 0) {
      console.log(`   Indicators: ${result.indicators.join(', ')}`);
    }
    passed++;
  } else {
    console.log(`❌ ${testCase.description}`);
    console.log(`   Expected: isAI=${testCase.expected.isAI}`);
    console.log(`   Got: isAI=${result.isAI}`);
    failed++;
  }
  console.log('');
}

// 結果サマリー
console.log('\n' + '='.repeat(50));
console.log('📊 Test Results Summary:');
console.log('─'.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All security tests passed!');
} else {
  console.log('\n⚠️ Some tests failed. Please review the security implementation.');
}

// 3. セキュリティ設定の確認
console.log('\n3. Security Configuration:');
console.log('─'.repeat(50));

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkConfig() {
  try {
    const result = await db.execute('SELECT * FROM security_config ORDER BY config_key');
    console.log('Current Security Settings:');
    for (const row of result.rows) {
      console.log(`   ${row.config_key}: ${row.config_value}`);
    }
    
    // 重要な設定の確認
    console.log('\n⚙️ Critical Settings Check:');
    const criticalSettings = [
      { key: 'report_threshold', expected: '3', desc: '管理者通知閾値' },
      { key: 'auto_hide_threshold', expected: '10', desc: '自動非公開閾値' },
      { key: 'rate_limit_posts', expected: '3', desc: '投稿制限数' },
      { key: 'ng_word_filter_v2', expected: 'true', desc: '強化版NGフィルター' },
    ];
    
    for (const setting of criticalSettings) {
      const value = result.rows.find(r => r.config_key === setting.key)?.config_value;
      if (value === setting.expected) {
        console.log(`   ✅ ${setting.desc}: ${value}`);
      } else {
        console.log(`   ⚠️ ${setting.desc}: ${value} (expected: ${setting.expected})`);
      }
    }
    
  } catch (error) {
    console.error('Failed to check configuration:', error);
  }
}

checkConfig().then(() => {
  console.log('\n✅ Security feature testing completed!');
  process.exit(failed > 0 ? 1 : 0);
});