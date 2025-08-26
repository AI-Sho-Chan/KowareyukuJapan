/**
 * サイトのコンセプトに基づいたカテゴリー定義
 * 「美しい日本を守る」保守系ニュースアグリゲーター
 */

export interface Category {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  autoApprove: boolean;
  priority: number;
}

export const CATEGORIES: Category[] = [
  {
    id: 'conservative',
    name: '保守メディア',
    description: '日本の伝統と文化を守る保守系メディア',
    keywords: ['保守', '愛国', '日本第一', '憲法改正', '国防', '皇室'],
    autoApprove: true,
    priority: 1
  },
  {
    id: 'anti-ccp',
    name: '反中国共産党',
    description: '中国共産党の脅威と実態を報道',
    keywords: ['中国共産党', '人権弾圧', 'ウイグル', '香港', '台湾', 'ステルスインベイジョン'],
    autoApprove: true,
    priority: 2
  },
  {
    id: 'proactive-fiscal',
    name: '積極財政',
    description: '積極財政政策を支持する経済ニュース',
    keywords: ['積極財政', 'MMT', '反緊縮', '財政出動', '公共投資', '国債発行'],
    autoApprove: true,
    priority: 3
  },
  {
    id: 'anti-mof',
    name: '財務省批判',
    description: '財務省の緊縮財政政策を批判',
    keywords: ['財務省', '緊縮財政', '増税反対', 'プライマリーバランス', '消費税廃止'],
    autoApprove: true,
    priority: 4
  },
  {
    id: 'foreign-crime',
    name: '迷惑外国人',
    description: '外国人犯罪と不法行為の記録',
    keywords: ['外国人犯罪', '不法滞在', '迷惑行為', 'クルド人', '移民問題', '治安悪化'],
    autoApprove: true,
    priority: 5
  },
  {
    id: 'pro-china-politicians',
    name: '媚中政治家',
    description: '中国に迎合する政治家の監視',
    keywords: ['媚中', '親中派', '二階', '公明党', '創価学会', '統一教会'],
    autoApprove: true,
    priority: 6
  },
  {
    id: 'mainstream-media',
    name: '主流メディア',
    description: '一般的なニュースソース（要精査）',
    keywords: [],
    autoApprove: false,
    priority: 10
  },
  {
    id: 'international',
    name: '国際ニュース',
    description: '世界情勢と日本への影響',
    keywords: ['国際情勢', 'アメリカ', 'ロシア', 'ウクライナ', '中東'],
    autoApprove: false,
    priority: 8
  },
  {
    id: 'politics',
    name: '政治',
    description: '国内政治ニュース',
    keywords: ['国会', '選挙', '政党', '政策'],
    autoApprove: false,
    priority: 7
  }
];

/**
 * キーワードマッチングによるカテゴリー判定
 */
export function detectCategory(title: string, content: string): string | null {
  const text = `${title} ${content}`.toLowerCase();
  
  for (const category of CATEGORIES.sort((a, b) => a.priority - b.priority)) {
    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }
  
  return null;
}

/**
 * カテゴリーによる自動承認判定
 */
export function shouldAutoApprove(categoryId: string): boolean {
  const category = CATEGORIES.find(c => c.id === categoryId);
  return category?.autoApprove || false;
}