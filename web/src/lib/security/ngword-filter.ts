// NGワードフィルタリングシステム
// 不適切な内容を検出・ブロックする

export class NGWordFilter {
  // NGワードリスト（実運用では環境変数やDBから読み込む）
  private static ngWords = [
    // 暴力的な表現
    '殺す', '死ね', 'タヒね', '氏ね', '○ね',
    
    // 差別的表現（一部マスク表記）
    'きち○い', 'ガ○ジ', 'し○う',
    
    // 個人情報の可能性があるパターン（正規表現）
    /\d{3}-?\d{4}-?\d{4}/g, // 電話番号パターン
    /\d{7}-?\d{4}/g, // 郵便番号パターン
    
    // スパム系
    '儲かる', '稼げる', '月収100万', '簡単副業',
    'ビットコイン', '仮想通貨で', 'FXで稼',
    
    // 政治的過激表現（慎重に設定）
    'テロ', '爆破', '襲撃予告',
    
    // URL短縮サービス（フィッシング対策）
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co',
  ];

  // センシティブだが許可する文脈もある単語（警告レベル）
  private static warningWords = [
    '自殺', '犯罪', '麻薬', '薬物',
    'ナイフ', '銃', '武器',
  ];

  /**
   * テキストをチェックしてNGワードを検出
   */
  static check(text: string): {
    isBlocked: boolean;
    hasWarning: boolean;
    detectedWords: string[];
    warningWords: string[];
    score: number;
  } {
    if (!text) {
      return {
        isBlocked: false,
        hasWarning: false,
        detectedWords: [],
        warningWords: [],
        score: 0,
      };
    }

    const normalizedText = this.normalize(text);
    const detectedWords: string[] = [];
    const detectedWarnings: string[] = [];
    let score = 0;

    // NGワードチェック
    for (const word of this.ngWords) {
      if (word instanceof RegExp) {
        const matches = normalizedText.match(word);
        if (matches) {
          detectedWords.push(...matches);
          score += matches.length * 10;
        }
      } else {
        const normalizedWord = this.normalize(word);
        if (normalizedText.includes(normalizedWord)) {
          detectedWords.push(word);
          score += 10;
        }
      }
    }

    // 警告ワードチェック
    for (const word of this.warningWords) {
      const normalizedWord = this.normalize(word);
      if (normalizedText.includes(normalizedWord)) {
        detectedWarnings.push(word);
        score += 5;
      }
    }

    return {
      isBlocked: detectedWords.length > 0 || score >= 20,
      hasWarning: detectedWarnings.length > 0,
      detectedWords: [...new Set(detectedWords)],
      warningWords: [...new Set(detectedWarnings)],
      score,
    };
  }

  /**
   * テキストをマスク処理
   */
  static mask(text: string): string {
    if (!text) return text;

    let maskedText = text;

    // NGワードをマスク
    for (const word of this.ngWords) {
      if (word instanceof RegExp) {
        maskedText = maskedText.replace(word, (match) => '*'.repeat(match.length));
      } else {
        const regex = new RegExp(this.escapeRegex(word), 'gi');
        maskedText = maskedText.replace(regex, '*'.repeat(word.length));
      }
    }

    return maskedText;
  }

  /**
   * テキストの正規化（判定精度向上のため）
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
      // 記号を除去（URLは除く）
      .replace(/[!！?？。、.,@#$%^&*()_+=\-~`{}[\]|\\:;"'<>]/g, '');
  }

  /**
   * 正規表現エスケープ
   */
  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * NGワードリストに単語を追加（管理者用）
   */
  static addNGWord(word: string): void {
    if (!this.ngWords.includes(word)) {
      this.ngWords.push(word);
    }
  }

  /**
   * NGワードリストから単語を削除（管理者用）
   */
  static removeNGWord(word: string): void {
    const index = this.ngWords.indexOf(word);
    if (index > -1) {
      this.ngWords.splice(index, 1);
    }
  }

  /**
   * スパム判定（連続投稿や同一内容の検出）
   */
  static isSpam(text: string, recentTexts: string[]): boolean {
    if (!text || recentTexts.length === 0) return false;

    const normalizedText = this.normalize(text);
    
    // 同一内容の連続投稿チェック
    const duplicates = recentTexts.filter(
      recent => this.normalize(recent) === normalizedText
    );
    
    if (duplicates.length >= 2) return true;

    // 類似度チェック（簡易版）
    const similarPosts = recentTexts.filter(recent => {
      const similarity = this.calculateSimilarity(normalizedText, this.normalize(recent));
      return similarity > 0.8;
    });

    return similarPosts.length >= 3;
  }

  /**
   * 文字列の類似度計算（0-1）
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * レーベンシュタイン距離
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export default NGWordFilter;