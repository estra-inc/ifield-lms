/**
 * ダッシュボード用のフロントエンド型定義
 *
 * 各カードコンポーネントの Props 型と、ページ全体のデータ型を定義する。
 */

import type { ProjectStatus } from "@/lib/utils/project-status"

// ─── 目標達成率 ───

export interface GoalProgressData {
  monthly: {
    actual: number
    target: number | null
    percentage: number | null
  }
  weekly: {
    actual: number
    target: number | null
    percentage: number | null
  }
}

// ─── 教材完了率 ───

export interface TutorialProgressItem {
  tutorialSlug: string
  tutorialTitle: string
  genre: string
  completedSections: number
  totalSections: number
  percentage: number
}

// ─── 今日の日報 ───

export type DailyReportStatus =
  | {
      type: "entered"
      totalHours: number
      entries: { actualHours: number; content: string }[]
    }
  | {
      type: "not_entered"
    }

// ─── コーチング ───

export interface CoachingData {
  creditBalance: number
  nextSession: {
    sessionDate: string
    startTime: string
    endTime: string
    genre: string
  } | null
}

// ─── 模擬案件 ───

export interface ProjectItem {
  projectSlug: string
  projectTitle: string
  projectGenre: string
  status: ProjectStatus
  latestScore: number | null
}

export interface ProjectsData {
  activeProjects: ProjectItem[]
  recentCompleted: ProjectItem[]
}

// ─── スキルレポート ───

export interface SkillCategoryScore {
  categoryLarge: string
  okCount: number
  totalCount: number
  percentage: number
}

export interface SkillReportData {
  categories: SkillCategoryScore[]
  hasData: boolean
}

// ─── ダッシュボード全体 ───

export interface DashboardData {
  profile: {
    fullName: string | null
    role: "user" | "manager" | "super_admin"
    defaultGenre: string | null
  }
  isBanned: boolean
  goalProgress: GoalProgressData
  tutorialProgress: TutorialProgressItem[]
  dailyReport: DailyReportStatus
  coaching: CoachingData
  projects: ProjectsData
  skillReport: SkillReportData
}
