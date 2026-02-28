/**
 * Jaro-Winkler距離アルゴリズムの実装
 * 文字列の類似度を計算するアルゴリズム。値が1に近いほど類似していることを示す。
 */
export class JaroWinklerDistance {
  constructor(prefixScale = 0.1, boostThreshold = 0.7, prefixLength = 4) {
    this.prefixScale = prefixScale;      // プレフィックス重み
    this.boostThreshold = boostThreshold; // ブースト閾値
    this.prefixLength = prefixLength;     // プレフィックス最大長
  }

  /**
   * 2つの文字列の類似度を計算
   * @param {string} s1 - 比較する文字列1
   * @param {string} s2 - 比較する文字列2
   * @returns {number} - 類似度（0〜1）、1が完全一致
   */
  similarity(s1, s2) {
    if (s1 === s2) return 1.0;
    
    // 空文字列の場合
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    // Jaro距離を計算
    const jaroScore = this.jaro(s1, s2);
    
    // スコアが閾値未満の場合はそのまま返す
    if (jaroScore < this.boostThreshold) {
      return jaroScore;
    }
    
    // 共通プレフィックスの長さを計算（最大prefixLength文字まで）
    let prefixLength = 0;
    const maxPrefixLength = Math.min(this.prefixLength, Math.min(s1.length, s2.length));
    
    for (let i = 0; i < maxPrefixLength; i++) {
      if (s1[i] === s2[i]) {
        prefixLength++;
      } else {
        break;
      }
    }
    
    // Jaro-Winklerスコアを計算
    return jaroScore + (prefixLength * this.prefixScale * (1 - jaroScore));
  }

  /**
   * Jaro距離を計算
   * @param {string} s1 - 比較する文字列1
   * @param {string} s2 - 比較する文字列2
   * @returns {number} - Jaro距離（0〜1）
   */
  jaro(s1, s2) {
    // 短い文字列と長い文字列を決定
    let shorter = s1;
    let longer = s2;
    
    if (s1.length > s2.length) {
      shorter = s2;
      longer = s1;
    }
    
    // マッチング距離を計算（短い文字列の長さの半分まで）
    const matchDistance = Math.floor(Math.max(longer.length / 2 - 1, 0));
    
    // 各文字列のマッチフラグ
    const shorterMatches = new Array(shorter.length).fill(false);
    const longerMatches = new Array(longer.length).fill(false);
    
    // マッチング文字数をカウント
    let matchCount = 0;
    
    // 一致する文字を探す
    for (let i = 0; i < shorter.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, longer.length);
      
      for (let j = start; j < end; j++) {
        if (!longerMatches[j] && shorter[i] === longer[j]) {
          shorterMatches[i] = true;
          longerMatches[j] = true;
          matchCount++;
          break;
        }
      }
    }
    
    // マッチする文字がない場合は0を返す
    if (matchCount === 0) return 0.0;
    
    // 転置数をカウント
    let transpositions = 0;
    let k = 0;
    
    for (let i = 0; i < shorter.length; i++) {
      if (shorterMatches[i]) {
        while (!longerMatches[k]) {
          k++;
        }
        
        if (shorter[i] !== longer[k]) {
          transpositions++;
        }
        
        k++;
      }
    }
    
    // 転置は実際の半分としてカウント
    transpositions = Math.floor(transpositions / 2);
    
    // Jaro距離を計算して返す
    return (
      (matchCount / s1.length + 
       matchCount / s2.length + 
       (matchCount - transpositions) / matchCount) / 3
    );
  }
}
