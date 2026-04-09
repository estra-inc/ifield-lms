/**
 * Slack Incoming Webhook 通知クライアント
 *
 * 環境変数 SLACK_WEBHOOK_URL に設定された Webhook URL に対して
 * Block Kit 形式のメッセージを POST する。
 *
 * 設計方針:
 * - 環境変数未設定時は no-op（ローカル開発・Preview デプロイで安全に動作）
 * - HTTP / ネットワークエラーは握り潰し、呼び出し元の処理を阻害しない
 * - すべてのログに `[notifications]` プレフィックスを付けて grep しやすくする
 */

export type SlackBlock = Record<string, unknown>

export type SlackPayload = {
  /** プッシュ通知バナー / フォールバック用の要約テキスト（必須） */
  text: string
  /** Block Kit 構造 */
  blocks: SlackBlock[]
}

/**
 * Slack Incoming Webhook へ通知を送信する。
 *
 * - SLACK_WEBHOOK_URL 未設定時: console.warn を出して no-op
 * - HTTP 4xx/5xx: console.error にステータスとレスポンスボディを記録するが例外を投げない
 * - ネットワークエラー: console.error を出すが例外を投げない
 *
 * 呼び出し元はこの関数の失敗を意識する必要はない（fail-safe）。
 */
export async function notifySlack(payload: SlackPayload): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL

  if (!url) {
    console.warn(
      "[notifications] SLACK_WEBHOOK_URL is not set, skipping notification"
    )
    return
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "<unable to read body>")
      console.error(
        `[notifications] Slack webhook failed: status=${res.status} body=${body}`
      )
    }
  } catch (err) {
    console.error("[notifications] Slack webhook network error:", err)
  }
}
