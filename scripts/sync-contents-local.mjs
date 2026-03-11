#!/usr/bin/env node

/**
 * ローカル開発用コンテンツ同期スクリプト
 *
 * 使い方:
 *   node scripts/sync-contents-local.mjs <repo-root-dir>
 *
 * 例:
 *   node scripts/sync-contents-local.mjs ../my-curriculum-repo
 *
 * repo-root-dir 内の以下を走査:
 *   curriculums/     - 教材コンテンツ（.md）
 *   exercises/       - 演習問題（.json）
 *   mock-projects/   - 模擬案件（.json）
 *
 * 環境変数:
 *   LMS_BASE_URL  - デフォルト: http://localhost:3000
 *   SYNC_API_KEY  - .env.local から自動読み込み（未設定時はエラー）
 */

import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..", "lms-fe")

// .env.local から環境変数を読み込む（簡易実装）
function loadEnvLocal() {
  const envPath = path.join(PROJECT_ROOT, ".env.local")
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "")
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvLocal()

const LMS_BASE_URL = process.env.LMS_BASE_URL || "http://localhost:3000"
const SYNC_API_KEY = process.env.SYNC_API_KEY

if (!SYNC_API_KEY) {
  console.error("❌ SYNC_API_KEY が設定されていません。")
  console.error("   lms-fe/.env.local に SYNC_API_KEY=xxx を追加するか、環境変数で指定してください。")
  process.exit(1)
}

const repoRootArg = process.argv[2]
if (!repoRootArg) {
  console.error("❌ 教材リポジトリのルートディレクトリを指定してください。")
  console.error("   使い方: node scripts/sync-contents-local.mjs <repo-root-dir>")
  console.error("   例:     node scripts/sync-contents-local.mjs ../my-curriculum-repo")
  process.exit(1)
}

const repoRoot = path.resolve(repoRootArg)
if (!fs.existsSync(repoRoot)) {
  console.error(`❌ ディレクトリが見つかりません: ${repoRoot}`)
  process.exit(1)
}

const curriculumDir = path.join(repoRoot, "curriculums")
const exercisesDir = path.join(repoRoot, "exercises")
const mockProjectsDir = path.join(repoRoot, "mock-projects")

if (!fs.existsSync(curriculumDir)) {
  console.error(`❌ curriculums ディレクトリが見つかりません: ${curriculumDir}`)
  process.exit(1)
}

// ============================================================
// パーサー: 教材リポジトリの命名規則に対応
// ============================================================

/**
 * YAML フロントマターをパースする（任意・簡易実装）
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { attributes: {}, body: content }

  const attributes = {}
  const lines = match[1].split("\n")
  for (const line of lines) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (/^\d+$/.test(value)) {
      attributes[key] = parseInt(value, 10)
    } else {
      attributes[key] = value
    }
  }

  const body = content.slice(match[0].length).trim()
  return { attributes, body }
}

/**
 * Markdown 本文から最初の # 見出しを抽出する
 */
function extractFirstHeading(body) {
  const match = body.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * ディレクトリ名からスラグとタイトルを分離する
 *
 * 命名規則: "<slug>: <タイトル>" (例: "tutorial-10: webフレームワーク...")
 * ": " がない場合はディレクトリ名全体をスラグとして使用
 */
function parseDirName(name) {
  const separatorIndex = name.indexOf(": ")
  if (separatorIndex !== -1) {
    return {
      slug: name.slice(0, separatorIndex).trim(),
      title: name,
    }
  }
  return {
    slug: name,
    title: name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }
}

/**
 * スラグからorderを抽出する
 *
 * 例: "tutorial-10" → 10, "chapter-1" → 1
 */
function extractOrderFromSlug(slug) {
  const match = slug.match(/[-_](\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * セクションファイル名を解析する
 *
 * 命名規則: "<T>-<C>-<S>_<タイトル>.md" (例: "10-1-1_LaravelFortifyとは.md")
 * - スラグ: 数字プレフィックス部分 (例: "10-1-1")
 * - タイトル: アンダースコア以降 (例: "LaravelFortifyとは")
 * - order: 3番目の数字 (例: 1)
 */
function parseSectionFilename(filename) {
  const base = filename.replace(/\.md$/, "")
  const underscoreIndex = base.indexOf("_")

  if (underscoreIndex !== -1) {
    const prefix = base.slice(0, underscoreIndex)
    const title = base.slice(underscoreIndex + 1)
    const nums = prefix.split("-").filter((s) => /^\d+$/.test(s))
    const order = nums.length > 0 ? parseInt(nums[nums.length - 1], 10) : 0
    return { slug: prefix, title, order }
  }

  // アンダースコアなしのフォールバック
  const numMatch = base.match(/^(\d+)[-_.]/)
  return {
    slug: base,
    title: base.replace(/^\d+[-_.]/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    order: numMatch ? parseInt(numMatch[1], 10) : 0,
  }
}

/**
 * curriculums/ ディレクトリを再帰的に走査して教材コンテンツを収集する
 *
 * 4階層構造:
 *   curriculums/<genre>/<tutorial>/<chapter>/<section>.md
 *
 * 命名規則:
 *   genre:    "engineering"
 *   tutorial: "tutorial-10: タイトル"
 *   chapter:  "chapter-1: タイトル"
 *   section:  "10-1-1_タイトル.md"
 */
function collectContents(dir) {
  const contents = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (!entry.isDirectory()) continue

    const genreDirName = entry.name
    const { slug: genreSlug, title: genreTitle } = parseDirName(genreDirName)

    // genre エントリを登録
    contents.push({
      slug_path: genreSlug,
      title: genreTitle,
      genre: genreSlug,
      tutorial: genreSlug,
      content_type: "genre",
      order: extractOrderFromSlug(genreSlug),
    })

    // tutorial 階層
    const genrePath = fullPath
    const tutorialEntries = fs.readdirSync(genrePath, { withFileTypes: true })

    for (const tutorialEntry of tutorialEntries) {
      if (!tutorialEntry.isDirectory()) continue

      const { slug: tutorialSlug, title: tutorialTitle } = parseDirName(tutorialEntry.name)
      const tutorialSlugPath = `${genreSlug}/${tutorialSlug}`

      contents.push({
        slug_path: tutorialSlugPath,
        title: tutorialTitle,
        genre: genreSlug,
        tutorial: tutorialSlug,
        content_type: "tutorial",
        order: extractOrderFromSlug(tutorialSlug),
      })

      // chapter 階層
      const tutorialPath = path.join(genrePath, tutorialEntry.name)
      const chapterEntries = fs.readdirSync(tutorialPath, { withFileTypes: true })

      for (const chapterEntry of chapterEntries) {
        if (!chapterEntry.isDirectory()) continue

        const { slug: chapterSlug, title: chapterTitle } = parseDirName(chapterEntry.name)
        const chapterSlugPath = `${tutorialSlugPath}/${chapterSlug}`

        contents.push({
          slug_path: chapterSlugPath,
          title: chapterTitle,
          genre: genreSlug,
          tutorial: tutorialSlug,
          chapter: chapterSlug,
          content_type: "chapter",
          order: extractOrderFromSlug(chapterSlug),
        })

        // section 階層
        const chapterPath = path.join(tutorialPath, chapterEntry.name)
        const sectionEntries = fs.readdirSync(chapterPath, { withFileTypes: true })

        for (const sectionEntry of sectionEntries) {
          if (!sectionEntry.isFile()) continue
          if (!sectionEntry.name.endsWith(".md")) continue
          if (sectionEntry.name === "_index.md") continue

          try {
            const sectionPath = path.join(chapterPath, sectionEntry.name)
            const raw = fs.readFileSync(sectionPath, "utf-8")
            const { attributes, body } = parseFrontmatter(raw)
            const parsed = parseSectionFilename(sectionEntry.name)

            // タイトル解決: フロントマター → # 見出し → ファイル名
            const title = attributes.title || extractFirstHeading(body) || parsed.title
            const order = typeof attributes.order === "number" ? attributes.order : parsed.order
            const sectionSlugPath = `${chapterSlugPath}/${parsed.slug}`

            contents.push({
              slug_path: sectionSlugPath,
              title,
              body,
              genre: genreSlug,
              tutorial: tutorialSlug,
              chapter: chapterSlug,
              section: parsed.slug,
              content_type: "section",
              order,
            })
          } catch (err) {
            console.warn(`⚠️  Failed to parse "${path.join(chapterPath, sectionEntry.name)}": ${err.message}`)
          }
        }
      }
    }
  }

  return contents
}

/**
 * exercises/ ディレクトリからクイズ JSON を再帰収集する
 *
 * 構造: exercises/{genre}/{tutorial}/{chapter}/{section}.json
 * ディレクトリ構造は整理用。メタデータは JSON 内に明示的に記述される。
 */
function collectQuizzes(rootDir) {
  const quizzes = []
  if (!fs.existsSync(rootDir)) return quizzes

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue

      try {
        const raw = fs.readFileSync(fullPath, "utf-8")
        const quizData = JSON.parse(raw)

        const requiredFields = ["genre", "tutorial", "chapter", "section", "slug", "title", "questions"]
        const missingFields = requiredFields.filter((f) => !quizData[f])
        if (missingFields.length > 0) {
          console.warn(`⚠️  Quiz file "${fullPath}" is missing required fields: ${missingFields.join(", ")}. Skipping.`)
          continue
        }

        const relativePath = path.relative(rootDir, fullPath)
        quizzes.push({
          file_path: relativePath,
          genre: quizData.genre,
          tutorial: quizData.tutorial,
          chapter: quizData.chapter,
          section: quizData.section,
          slug: quizData.slug,
          title: quizData.title,
          questions: quizData.questions,
        })
      } catch (err) {
        console.warn(`⚠️  Failed to parse quiz "${fullPath}": ${err.message}`)
      }
    }
  }

  walk(rootDir)
  return quizzes
}

/**
 * mock-projects/ ディレクトリから模擬案件 JSON を収集する
 *
 * 構造: mock-projects/{genre}/{project}.json
 * ジャンルサブディレクトリ名は JSON 内の genre フィールドと一致する必要がある。
 */
function collectMockProjects(rootDir) {
  const mockProjects = []
  if (!fs.existsSync(rootDir)) return mockProjects

  const validGenres = ["engineering", "design"]
  const genreEntries = fs.readdirSync(rootDir, { withFileTypes: true })

  for (const genreEntry of genreEntries) {
    if (!genreEntry.isDirectory()) continue

    const genreName = genreEntry.name
    if (!validGenres.includes(genreName)) {
      console.warn(`⚠️  Unknown genre directory "${genreName}" in mock-projects/. Skipping.`)
      continue
    }

    const genrePath = path.join(rootDir, genreName)
    const projectEntries = fs.readdirSync(genrePath, { withFileTypes: true })

    for (const projectEntry of projectEntries) {
      if (!projectEntry.isFile() || !projectEntry.name.endsWith(".json")) continue

      const fullPath = path.join(genrePath, projectEntry.name)
      try {
        const raw = fs.readFileSync(fullPath, "utf-8")
        const projectData = JSON.parse(raw)

        const requiredFields = ["slug", "title", "genre", "order"]
        const missingFields = requiredFields.filter((f) => projectData[f] === undefined || projectData[f] === null)
        if (missingFields.length > 0) {
          console.warn(`⚠️  Mock project "${fullPath}" is missing required fields: ${missingFields.join(", ")}. Skipping.`)
          continue
        }

        if (projectData.genre !== genreName) {
          console.warn(`⚠️  Mock project "${fullPath}" has genre "${projectData.genre}" but is in "${genreName}/" directory. Skipping.`)
          continue
        }

        mockProjects.push({
          slug: projectData.slug,
          title: projectData.title,
          description: projectData.description ?? null,
          requirements: projectData.requirements ?? null,
          evaluation_items: projectData.evaluation_items ?? [],
          genre: projectData.genre,
          order: projectData.order,
          status: projectData.status ?? "active",
        })
      } catch (err) {
        console.warn(`⚠️  Failed to parse mock project "${fullPath}": ${err.message}`)
      }
    }
  }

  return mockProjects
}

// ============================================================
// Git コミットハッシュの取得
// ============================================================

/**
 * HEAD のコミットハッシュを取得する
 * まず教材ディレクトリ（教材リポジトリ）で取得を試み、
 * 失敗した場合は現在のディレクトリで取得を試みる。
 * いずれも失敗した場合は 'unknown' にフォールバック。
 */
function getCommitHash(repoDir) {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoDir, encoding: 'utf-8' }).trim()
  } catch {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    } catch {
      console.warn("⚠️  git rev-parse HEAD の実行に失敗しました。commit_hash に 'unknown' を使用します。")
      return 'unknown'
    }
  }
}

/**
 * HEAD のコミットメッセージ（1行目）を取得する
 */
function getCommitMessage(repoDir) {
  try {
    return execSync('git log -1 --format=%s', { cwd: repoDir, encoding: 'utf-8' }).trim()
  } catch {
    try {
      return execSync('git log -1 --format=%s', { encoding: 'utf-8' }).trim()
    } catch {
      console.warn("⚠️  git log の実行に失敗しました。commit_message を空にします。")
      return ''
    }
  }
}

async function main() {
  console.log(`📂 Scanning "${curriculumDir}"...`)

  const contents = collectContents(curriculumDir)

  if (contents.length === 0) {
    console.warn("⚠️  No contents found. Nothing to sync.")
    return
  }

  console.log(`📦 Found ${contents.length} content items.`)

  // 内訳を表示
  const counts = { genre: 0, tutorial: 0, chapter: 0, section: 0 }
  for (const c of contents) counts[c.content_type]++
  console.log(`   Genres: ${counts.genre}, Tutorials: ${counts.tutorial}, Chapters: ${counts.chapter}, Sections: ${counts.section}`)

  console.log(`📂 Scanning "${exercisesDir}"...`)
  const quizzes = collectQuizzes(exercisesDir)

  if (quizzes.length > 0) {
    console.log(`🧩 Found ${quizzes.length} quiz file(s).`)
  } else {
    console.log(`🧩 No quiz files found.`)
  }

  console.log(`📂 Scanning "${mockProjectsDir}"...`)
  const mockProjects = collectMockProjects(mockProjectsDir)

  if (mockProjects.length > 0) {
    console.log(`🏗️  Found ${mockProjects.length} mock project(s).`)
  } else {
    console.log(`🏗️  No mock projects found.`)
  }

  const commitHash = getCommitHash(repoRoot)
  const commitMessage = getCommitMessage(repoRoot)
  console.log(`🔖 Commit hash: ${commitHash}`)
  console.log(`💬 Commit message: ${commitMessage || '(empty)'}`)

  const url = `${LMS_BASE_URL.replace(/\/$/, "")}/api/admin/sync-curriculums`
  console.log(`🚀 Syncing to ${url}...`)

  const payload = { contents, commit_hash: commitHash, commit_message: commitMessage }
  if (quizzes.length > 0) {
    payload.quizzes = quizzes
  }
  if (mockProjects.length > 0) {
    payload.mock_projects = mockProjects
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": SYNC_API_KEY,
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    console.error("❌ Sync failed:", JSON.stringify(result, null, 2))
    process.exit(1)
  }

  console.log("✅ Sync completed!")
  console.log(`   Contents - Created/Updated: ${result.summary.created}, Archived: ${result.summary.archived}`)
  if (result.quiz_summary) {
    console.log(`   Quizzes  - Created/Updated: ${result.quiz_summary.created}, Archived: ${result.quiz_summary.archived}`)
  }
  if (result.mock_project_summary) {
    console.log(`   Projects - Created/Updated: ${result.mock_project_summary.created}, Archived: ${result.mock_project_summary.archived}`)
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err.message)
  process.exit(1)
})
