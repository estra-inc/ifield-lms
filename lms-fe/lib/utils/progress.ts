/**
 * 進捗バー関連のユーティリティ関数
 */

/**
 * 月次進捗率から進捗バーの色を決定する
 * 80%以上: green, 50-79%: primary, 30-49%: yellow, 30%未満: red
 */
export function getProgressColor(percentage: number): "green" | "primary" | "yellow" | "red" {
  if (percentage >= 80) return "green"
  if (percentage >= 50) return "primary"
  if (percentage >= 30) return "yellow"
  return "red"
}

/**
 * 進捗バーの色に対応する CSS クラスを返す
 */
export function getProgressColorClass(color: "green" | "primary" | "yellow" | "red"): string {
  const colorMap: Record<string, string> = {
    green: "bg-green-500",
    primary: "bg-[#00B0EC]",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  }
  return colorMap[color]
}
