/**
 * 選択肢のランダムシャッフル関数
 *
 * Fisher-Yates アルゴリズムで配列をランダムにシャッフルする。
 * 元の配列を変更せず、シャッフルされた新しい配列を返す（イミュータブル）。
 *
 * Requirements: 3.7, 4.8
 */

/**
 * 配列をランダムにシャッフルした新しい配列を返す。
 *
 * @param options - シャッフル対象の読み取り専用配列
 * @returns シャッフルされた新しい配列
 */
export function shuffleOptions<T>(options: readonly T[]): T[] {
  const shuffled = [...options]

  // Fisher-Yates (Knuth) shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}
