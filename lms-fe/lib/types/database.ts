import type { QuestionItem, QuizAnswerRecord } from "./quiz"
import type { EvaluationCategory } from "./grading"

/**
 * business_hours の JSONB 構造定義
 *
 * slots: 曜日_時刻 をキーとしたブール値マップ
 *   - キーフォーマット: "{day}_{HHMM}" (例: "mon_0900", "fri_1430")
 *   - true = 稼働, false = 非稼働
 *   - 存在しないキーは非稼働として扱う
 *
 * holidayShift: 祝日を直近の平日シフトとして扱うか
 * bufferMinutes: 予約前後の確保時間（分）
 * slotDurationMinutes: 1枠のスロット時間（分）
 */
export interface BusinessHours {
  slots: Record<string, boolean>
  holidayShift: boolean
  bufferMinutes: number
  slotDurationMinutes: number
  /** 何日後から予約を受け付けるか（日数） */
  bookingLeadDays: number
  /** 何週間先までカレンダーに表示するか（週数） */
  bookingWindowWeeks: number
}

/** コーチングジャンル */
export type CoachingGenre = "engineering" | "design"

/** コーチ情報 */
export interface CoachInfo {
  coachId: string
  coachName: string
}

/** コーチ割り当て状態 */
export type CoachAssignmentStatus =
  | { type: "unassigned" }
  | { type: "assigned"; coach: CoachInfo }
  | { type: "departed"; previousCoachName: string }

/** ジャンル別稼働時間枠 */
export interface GenreBusinessHours {
  engineering: BusinessHours
  design: BusinessHours
}

/**
 * Supabase Database 型定義
 *
 * profiles, daily_reports, monthly_goals, weekly_goals, contents,
 * content_versions, quizzes, quiz_logs, mock_projects, project_assignments,
 * project_submissions, project_tasks, project_evaluations,
 * project_evaluation_details テーブルを含むデータベース型。
 * Supabase クライアントの型パラメータとして使用する。
 *
 * 注: 本来は `supabase gen types typescript` で自動生成するのが推奨。
 * 現時点では手動で必要最小限のテーブル定義を行い、
 * 将来的に自動生成へ移行する。
 */

/**
 * 模擬案件の評価項目アイテム型
 * @deprecated PRD 準拠の階層型 `EvaluationCategory` を使用してください。
 * 互換性維持のため残しているが、新規コードでは `EvaluationCategory` を使用すること。
 */
export interface EvaluationItem {
  id: string
  category: string
  criteria: string
  weight: number
}
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          last_name: string | null
          first_name: string | null
          email: string
          avatar_url: string | null
          role: "user" | "manager" | "super_admin"
          current_term: string | null
          graduation_date: string | null
          default_genre: string | null
          slack_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name?: string | null
          last_name?: string | null
          first_name?: string | null
          email?: string
          avatar_url?: string | null
          role: "user" | "manager" | "super_admin"
          current_term?: string | null
          graduation_date?: string | null
          default_genre?: string | null
          slack_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          last_name?: string | null
          first_name?: string | null
          email?: string
          avatar_url?: string | null
          role?: "user" | "manager" | "super_admin"
          current_term?: string | null
          graduation_date?: string | null
          default_genre?: string | null
          slack_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          id: string
          commit_hash: string
          commit_message: string | null
          status: "draft" | "active" | "archived"
          synced_at: string
          changes_summary: { added: number; updated: number; deleted: number }
          changed_paths: string[]
          quiz_changes_summary: { added: number; updated: number; deleted: number } | null
          mock_project_changes_summary: { added: number; updated: number; deleted: number } | null
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          commit_hash: string
          commit_message?: string | null
          status?: "draft" | "active" | "archived"
          synced_at?: string
          changes_summary?: { added: number; updated: number; deleted: number }
          changed_paths?: string[]
          quiz_changes_summary?: { added: number; updated: number; deleted: number } | null
          mock_project_changes_summary?: { added: number; updated: number; deleted: number } | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          commit_hash?: string
          commit_message?: string | null
          status?: "draft" | "active" | "archived"
          synced_at?: string
          changes_summary?: { added: number; updated: number; deleted: number }
          changed_paths?: string[]
          quiz_changes_summary?: { added: number; updated: number; deleted: number } | null
          mock_project_changes_summary?: { added: number; updated: number; deleted: number } | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_approved_by_fkey"
            columns: ["approved_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          id: string
          slug_path: string
          title: string
          body: string | null
          genre: string
          tutorial: string
          chapter: string | null
          section: string | null
          content_type: "genre" | "tutorial" | "chapter" | "section"
          order: number
          status: "active" | "archived"
          metadata: Record<string, unknown> | null
          version_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug_path: string
          title: string
          body?: string | null
          genre: string
          tutorial: string
          chapter?: string | null
          section?: string | null
          content_type: "genre" | "tutorial" | "chapter" | "section"
          order?: number
          status?: "active" | "archived"
          metadata?: Record<string, unknown> | null
          version_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug_path?: string
          title?: string
          body?: string | null
          genre?: string
          tutorial?: string
          chapter?: string | null
          section?: string | null
          content_type?: "genre" | "tutorial" | "chapter" | "section"
          order?: number
          status?: "active" | "archived"
          metadata?: Record<string, unknown> | null
          version_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_version_id_fkey"
            columns: ["version_id"]
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_progress: {
        Row: {
          id: string
          user_id: string
          content_id: string
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          completed_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_progress_content_id_fkey"
            columns: ["content_id"]
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          id: string
          user_id: string
          report_date: string
          actual_hours: number
          content: string
          liked_by_manager: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          report_date: string
          actual_hours: number
          content: string
          liked_by_manager?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          report_date?: string
          actual_hours?: number
          content?: string
          liked_by_manager?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goals: {
        Row: {
          id: string
          user_id: string
          year_month: string
          target_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year_month: string
          target_hours: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year_month?: string
          target_hours?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_goals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          target_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          target_hours: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          target_hours?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          id: string
          genre: string
          tutorial: string
          chapter: string
          section: string
          slug: string
          title: string
          questions: QuestionItem[]
          status: "active" | "archived"
          version_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          genre: string
          tutorial: string
          chapter: string
          section: string
          slug: string
          title: string
          questions: QuestionItem[]
          status?: "active" | "archived"
          version_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          genre?: string
          tutorial?: string
          chapter?: string
          section?: string
          slug?: string
          title?: string
          questions?: QuestionItem[]
          status?: "active" | "archived"
          version_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_version_id_fkey"
            columns: ["version_id"]
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_logs: {
        Row: {
          id: string
          user_id: string
          quiz_id: string
          score: number
          total_questions: number
          answers: QuizAnswerRecord[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quiz_id: string
          score: number
          total_questions: number
          answers: QuizAnswerRecord[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quiz_id?: string
          score?: number
          total_questions?: number
          answers?: QuizAnswerRecord[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_logs_quiz_id_fkey"
            columns: ["quiz_id"]
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_projects: {
        Row: {
          id: string
          slug: string
          title: string
          description: string | null
          requirements: string | null
          evaluation_items: EvaluationCategory[]
          genre: "engineering" | "design"
          order: number
          status: "active" | "archived"
          version_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          description?: string | null
          requirements?: string | null
          evaluation_items?: EvaluationCategory[]
          genre: "engineering" | "design"
          order?: number
          status?: "active" | "archived"
          version_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          description?: string | null
          requirements?: string | null
          evaluation_items?: EvaluationCategory[]
          genre?: "engineering" | "design"
          order?: number
          status?: "active" | "archived"
          version_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_projects_version_id_fkey"
            columns: ["version_id"]
            referencedRelation: "content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          id: string
          user_id: string
          project_id: string
          status: "started"
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          status?: "started"
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          status?: "started"
          due_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "mock_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_submissions: {
        Row: {
          id: string
          assignment_id: string
          submission_url: string | null
          submission_files: { name: string; url: string }[]
          status: "submitted" | "grading" | "graded" | "rejected"
          score: number | null
          result_data: Record<string, unknown> | null
          feedback_comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          submission_url?: string | null
          submission_files?: { name: string; url: string }[]
          status?: "submitted" | "grading" | "graded" | "rejected"
          score?: number | null
          result_data?: Record<string, unknown> | null
          feedback_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          submission_url?: string | null
          submission_files?: { name: string; url: string }[]
          status?: "submitted" | "grading" | "graded" | "rejected"
          score?: number | null
          result_data?: Record<string, unknown> | null
          feedback_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            referencedRelation: "project_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          id: string
          assignment_id: string
          task_number: number
          title: string
          description: string | null
          status: "backlog" | "todo" | "in_progress" | "done"
          order: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          task_number: number
          title: string
          description?: string | null
          status?: "backlog" | "todo" | "in_progress" | "done"
          order?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          task_number?: number
          title?: string
          description?: string | null
          status?: "backlog" | "todo" | "in_progress" | "done"
          order?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            referencedRelation: "project_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_evaluations: {
        Row: {
          id: string
          submission_id: string
          grader_id: string
          status: "draft" | "finalized"
          score: number | null
          feedback_comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          grader_id: string
          status?: "draft" | "finalized"
          score?: number | null
          feedback_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          grader_id?: string
          status?: "draft" | "finalized"
          score?: number | null
          feedback_comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_evaluations_submission_id_fkey"
            columns: ["submission_id"]
            referencedRelation: "project_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_evaluations_grader_id_fkey"
            columns: ["grader_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_evaluation_details: {
        Row: {
          id: string
          evaluation_id: string
          item_id: string
          category_large: string
          category_medium: string
          item_label: string
          point: number
          is_ok: boolean
          created_at: string
        }
        Insert: {
          id?: string
          evaluation_id: string
          item_id: string
          category_large: string
          category_medium: string
          item_label: string
          point: number
          is_ok?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          evaluation_id?: string
          item_id?: string
          category_large?: string
          category_medium?: string
          item_label?: string
          point?: number
          is_ok?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_evaluation_details_evaluation_id_fkey"
            columns: ["evaluation_id"]
            referencedRelation: "project_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_credits: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: "admin_grant" | "booking_consumed" | "cancellation_refund"
          reference_id: string | null
          granted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: "admin_grant" | "booking_consumed" | "cancellation_refund"
          reference_id?: string | null
          granted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: "admin_grant" | "booking_consumed" | "cancellation_refund"
          reference_id?: string | null
          granted_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_credits_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_credits_granted_by_fkey"
            columns: ["granted_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_credits_reference_id_fkey"
            columns: ["reference_id"]
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          id: string
          user_id: string
          session_date: string
          start_time: string
          end_time: string
          genre: "engineering" | "design"
          status: "scheduled" | "completed" | "cancelled_by_student" | "cancelled_by_admin" | "no_show"
          coach_id: string | null
          google_event_id: string | null
          google_meet_url: string | null
          cancelled_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_date: string
          start_time: string
          end_time: string
          genre?: "engineering" | "design"
          status?: "scheduled" | "completed" | "cancelled_by_student" | "cancelled_by_admin" | "no_show"
          coach_id?: string | null
          google_event_id?: string | null
          google_meet_url?: string | null
          cancelled_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_date?: string
          start_time?: string
          end_time?: string
          genre?: "engineering" | "design"
          status?: "scheduled" | "completed" | "cancelled_by_student" | "cancelled_by_admin" | "no_show"
          coach_id?: string | null
          google_event_id?: string | null
          google_meet_url?: string | null
          cancelled_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_coach_id_fkey"
            columns: ["coach_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_assignments: {
        Row: {
          id: string
          user_id: string
          genre: "engineering" | "design"
          coach_id: string
          assigned_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          genre: "engineering" | "design"
          coach_id: string
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          genre?: "engineering" | "design"
          coach_id?: string
          assigned_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_assignments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_coach_id_fkey"
            columns: ["coach_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          id: string
          admin_id: string
          encrypted_refresh_token: string
          connected_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          encrypted_refresh_token: string
          connected_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          encrypted_refresh_token?: string
          connected_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_integrations: {
        Row: {
          id: string
          service_name: string
          encrypted_refresh_token: string | null
          business_hours: BusinessHours | GenreBusinessHours
          connected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_name: string
          encrypted_refresh_token?: string | null
          business_hours?: BusinessHours | GenreBusinessHours
          connected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_name?: string
          encrypted_refresh_token?: string | null
          business_hours?: BusinessHours | GenreBusinessHours
          connected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      approve_content_version: {
        Args: {
          p_version_id: string
          p_approved_by: string
        }
        Returns: undefined
      }
      finalize_grading: {
        Args: {
          p_submission_id: string
          p_score: number
          p_result_data: Record<string, unknown>
          p_feedback_comment: string
        }
        Returns: {
          success: boolean
          score: number
          submission_id: string
        }
      }
      search_contents: {
        Args: {
          search_query: string
        }
        Returns: {
          id: string
          title: string
          snippet: string
          genre: string
          tutorial: string
          chapter: string
          section: string
          genre_title: string
          tutorial_title: string
          chapter_title: string
          score: number
        }[]
      }
      start_project: {
        Args: {
          p_user_id: string
          p_project_id: string
        }
        Returns: {
          assignment_id: string
          term_changed: boolean
        }
      }
      sync_content_version: {
        Args: {
          p_commit_hash: string
          p_contents: Record<string, unknown>[]
          p_commit_message: string | null
        }
        Returns: Record<string, unknown>
      }
      sync_mock_project_data: {
        Args: {
          p_version_id: string
          p_mock_projects: Record<string, unknown>[]
        }
        Returns: Record<string, unknown>
      }
      sync_quiz_data: {
        Args: {
          p_version_id: string
          p_quizzes: Record<string, unknown>[]
        }
        Returns: Record<string, unknown>
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
