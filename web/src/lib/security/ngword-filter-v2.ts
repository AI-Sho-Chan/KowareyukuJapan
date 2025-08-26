// 強化版NGワードフィルタリングシステム
// サイト保護、政治的攻撃対策、多言語フィルター含む

export class NGWordFilterV2 {
  // サイト自身への攻撃・誹謗中傷（最優先ブロック）
  private static siteAttackWords = [
    // サイト名への攻撃（旧名・新名両方対応）
    'kowareyukujapan', 'こわれゆくジャパン', 'こわれゆく日本',
    '守ろう日本', 'まもろう日本', 'まもろうにっぽん',
    'このサイト', 'この掲示板', 'ここの管理人',
    
    // 攻撃的表現との組み合わせ
    'クソサイト', 'ゴミサイト', '糞サイト', 'カスサイト',
    '管理人死', '管理人氏ね', '管理人くたばれ',
    '閉鎖しろ', '潰れろ', 'つぶれろ',
    '工作サイト', 'プロパガンダ', 'デマサイト',
    '統一教会', '壺', 'ネトウヨサイト',
  ];

  // 日本・天皇への攻撃（ブロック対象）
  private static antiJapanWords = [
    // 天皇・皇室への攻撃
    '天皇死', '天皇くたばれ', '天皇制廃止',
    '皇室解体', '皇族死',
    
    // 日本・日本人への攻撃
    'ジャップ', 'JAP', 'jap', '倭猿', '日本猿',
    '日本死ね', '日本滅びろ', '日本沈没',
    '戦犯国', '戦犯民族', 'A級戦犯',
    
    // 歴史問題の攻撃的表現は議論のため除外
    // '慰安婦', '性奴隷', '南京大虐殺', '強制連行',
    // '植民地支配', '侵略戦争', '戦争犯罪', - 議論用として許可
  ];

  // 反日思想からの攻撃的表現（ブロック対象）
  // ※ 「プロ市民」「シールズ」等は区別用語のため除外
  private static leftistAttackWords = [
    // 共産主義賛美
    '共産党万歳', '中国共産党', 
    '革命万歳', '粛清', '人民解放軍',
    
    // 特定人物への死ね系攻撃
    '安倍死', '自民党死', '政権打倒',
    
    // 中国・韓国への過度な賛美
    '中国父さん', '韓国兄さん',
  ];

  // 暴力的な表現（NGワードからブロック対象維持）
  private static violentWords = [
    '殺す', '死ね', 'タヒね', '氏ね', '○ね',
    'ころす', 'コロス', '564', '4ね',
    '死んでしまえ', 'くたばれ', '消えろ',
  ];

  // 警告レベル（NGから移動）
  private static warningWords = [
    // 元NGワードから移動
    'テロ', '爆破', '襲撃予告',
    
    // センシティブだが文脈による
    '自殺', '犯罪', '麻薬', '薬物',
    'ナイフ', '銃', '武器',
    '戦争', '紛争', '衝突',
  ];

  // 中国語・韓国語の検出パターン
  private static chineseKoreanPatterns = {
    // 中国語（簡体字・繁体字）
    chinese: /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\u2ceb0-\u2ebef]+/g,
    
    // 韓国語（ハングル）
    korean: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]+/g,
    
    // 中国語の一般的な単語
    chineseCommon: ['的', '是', '在', '我', '你', '他', '她', '这', '那', '有', '和', '了', '不', '人', '们', '中', '国'],
    
    // 韓国語の一般的な単語
    koreanCommon: ['의', '이', '가', '을', '를', '에', '는', '은', '로', '과', '와', '한', '하', '고', '있', '것', '수', '나', '그', '저'],
  };

  // スパム・商用系（既存）
  private static spamWords = [
    '儲かる', '稼げる', '月収100万', '簡単副業',
    'ビットコイン', '仮想通貨で', 'FXで稼',
    'カジノ', 'オンラインカジノ', 'パチンコ',
    'アダルト', 'エロ', 'セフレ', '出会い系',
  ];

  /**
   * 強化版テキストチェック
   */
  static check(text: string, options?: {
    checkTitle?: boolean;
    checkHandle?: boolean;
    checkComment?: boolean;
  }): {
    isBlocked: boolean;
    hasWarning: boolean;
    detectedWords: string[];
    warningWords: string[];
    blockedLanguages: string[];
    score: number;
    reason?: string;
  } {
    if (!text) {
      return {
        isBlocked: false,
        hasWarning: false,
        detectedWords: [],
        warningWords: [],
        blockedLanguages: [],
        score: 0,
      };
    }

    const normalizedText = this.normalize(text);
    const detectedWords: string[] = [];
    const detectedWarnings: string[] = [];
    const blockedLanguages: string[] = [];
    let score = 0;
    let reason = '';

    // 1. サイトへの攻撃チェック（最優先）
    for (const word of this.siteAttackWords) {
      if (normalizedText.includes(this.normalize(word))) {
        detectedWords.push(word);
        score += 100; // 即座にブロック
        reason = 'サイトへの攻撃・誹謗中傷';
      }
    }

    // 2. 反日・左翼攻撃チェック
    for (const word of this.antiJapanWords) {
      if (normalizedText.includes(this.normalize(word))) {
        detectedWords.push(word);
        score += 50;
        if (!reason) reason = '反日・政治的攻撃';
      }
    }

    // 3. 左翼思想からの攻撃チェック
    for (const word of this.leftistAttackWords) {
      if (normalizedText.includes(this.normalize(word))) {
        detectedWords.push(word);
        score += 50;
        if (!reason) reason = '政治的攻撃・プロパガンダ';
      }
    }

    // 4. 暴力的表現チェック
    for (const word of this.violentWords) {
      if (normalizedText.includes(this.normalize(word))) {
        detectedWords.push(word);
        score += 30;
        if (!reason) reason = '暴力的表現';
      }
    }

    // 5. 中国語・韓国語チェック
    const chineseMatches = text.match(this.chineseKoreanPatterns.chinese);
    const koreanMatches = text.match(this.chineseKoreanPatterns.korean);
    
    if (chineseMatches && chineseMatches.length > 0) {
      // 中国語の一般的な文字が3つ以上含まれる場合
      const chineseCount = this.chineseKoreanPatterns.chineseCommon.filter(
        char => text.includes(char)
      ).length;
      
      if (chineseCount >= 3 || chineseMatches[0].length >= 5) {
        blockedLanguages.push('中国語');
        score += 100;
        reason = '中国語の使用は禁止されています';
      }
    }
    
    if (koreanMatches && koreanMatches.length > 0) {
      // 韓国語の一般的な文字が2つ以上含まれる場合
      const koreanCount = this.chineseKoreanPatterns.koreanCommon.filter(
        char => text.includes(char)
      ).length;
      
      if (koreanCount >= 2 || koreanMatches[0].length >= 3) {
        blockedLanguages.push('韓国語');
        score += 100;
        reason = '韓国語の使用は禁止されています';
      }
    }

    // 6. スパムチェック
    for (const word of this.spamWords) {
      if (normalizedText.includes(this.normalize(word))) {
        detectedWords.push(word);
        score += 20;
        if (!reason) reason = 'スパム・商用コンテンツ';
      }
    }

    // 7. 警告ワードチェック
    for (const word of this.warningWords) {
      if (normalizedText.includes(this.normalize(word))) {
        detectedWarnings.push(word);
        score += 5;
      }
    }

    // 8. ハンドルネーム固有のチェック
    if (options?.checkHandle) {
      const suspiciousHandles = [
        '管理人', 'admin', 'administrator', 'moderator',
        '運営', '公式', 'official',
        '天皇', '皇', '殿下', '陛下',
        '金正恩', '習近平', '文在寅',
        '工作員', 'パヨク',
      ];
      
      for (const handle of suspiciousHandles) {
        if (normalizedText.includes(this.normalize(handle))) {
          detectedWords.push(handle);
          score += 50;
          reason = '不適切なハンドルネーム';
        }
      }
    }

    return {
      isBlocked: detectedWords.length > 0 || score >= 20 || blockedLanguages.length > 0,
      hasWarning: detectedWarnings.length > 0,
      detectedWords: [...new Set(detectedWords)],
      warningWords: [...new Set(detectedWarnings)],
      blockedLanguages,
      score,
      reason,
    };
  }

  /**
   * AI/Bot検出用の追加チェック
   */
  static detectAIGenerated(text: string): {
    isAI: boolean;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let confidence = 0;

    // AI生成テキストの特徴
    const aiPatterns = [
      // ChatGPT/Claude系の典型的なフレーズ
      /申し訳ございません/g,
      /お手伝いできます/g,
      /〜について説明します/g,
      /以下の[よう|とおり]/g,
      /まず、|次に、|最後に、/g,
      /結論として/g,
      
      // 過度に丁寧・形式的
      /させていただきます/g,
      /いたします/g,
      /おっしゃる通り/g,
      
      // リスト形式の多用
      /^[1-9１-９][\.．\)）]/gm,
      /^[・・•]/gm,
      
      // メタ言及
      /AIとして/g,
      /言語モデル/g,
      /プログラム/g,
    ];

    for (const pattern of aiPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        confidence += matches.length * 10;
        indicators.push(pattern.source);
      }
    }

    // 文章の均一性チェック
    const sentences = text.split(/[。！？\n]/);
    if (sentences.length > 5) {
      const avgLength = sentences.reduce((a, s) => a + s.length, 0) / sentences.length;
      const variance = sentences.reduce((a, s) => a + Math.pow(s.length - avgLength, 2), 0) / sentences.length;
      
      // 文章長が異常に均一
      if (variance < 100 && avgLength > 20) {
        confidence += 30;
        indicators.push('uniform_sentence_length');
      }
    }

    // 過度な構造化
    const structureScore = (
      (text.match(/^[#＃]/gm) || []).length * 10 + // 見出し
      (text.match(/^[\*＊\-－]/gm) || []).length * 5 + // 箇条書き
      (text.match(/「[^」]+」/g) || []).length * 3 // 引用符の多用
    );
    
    if (structureScore > 30) {
      confidence += structureScore;
      indicators.push('over_structured');
    }

    return {
      isAI: confidence >= 50,
      confidence: Math.min(confidence, 100),
      indicators,
    };
  }

  /**
   * テキストの正規化（改良版）
   */
  private static normalize(text: string): string {
    return text
      .toLowerCase()
      // 全角→半角
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      // カタカナ→ひらがな
      .replace(/[\u30a1-\u30f6]/g, (match) => {
        const chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
      })
      // スペース除去
      .replace(/\s+/g, '')
      // 記号を統一
      .replace(/[!！?？。、.,@#$%^&*()_+=\-~`{}[\]|\\:;"'<>]/g, '')
      // 伸ばし棒の統一
      .replace(/[ー〜～]/g, 'ー')
      // 数字の統一
      .replace(/[①-⑨]/g, (match) => String(match.charCodeAt(0) - '①'.charCodeAt(0) + 1));
  }
}

export default NGWordFilterV2;