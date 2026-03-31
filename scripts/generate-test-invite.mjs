/**
 * ローカル検証用: テスト招待リンクを生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-test-invite.mjs [email]
 *
 * 例:
 *   node scripts/generate-test-invite.mjs yotaro.t+test1@estra.jp
 *
 * メール送信は行わず、token_hash を含むローカルURLを出力します。
 */
import { createClient } from "@supabase/supabase-js"

const email = process.argv[2]
if (!email) {
  console.error("Usage: node scripts/generate-test-invite.mjs <email>")
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data, error } = await supabase.auth.admin.generateLink({
  type: "invite",
  email,
  options: {
    redirectTo: "http://localhost:3000/auth/callback",
    data: { role: "user" },
  },
})

if (error) {
  console.error("Error:", error.message)
  process.exit(1)
}

const tokenHash = data.properties?.hashed_token
console.log("\n=== テスト招待リンク ===")
console.log(`Email: ${email}`)
console.log(`Token Hash: ${tokenHash}`)
console.log(`\nURL: http://localhost:3000/auth/callback?token_hash=${tokenHash}&type=invite`)
console.log("\n※ このリンクは1回のセットアップ完了で消費されます")
