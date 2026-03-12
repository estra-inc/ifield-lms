import { notFound, redirect } from "next/navigation"
import { getAuthUser, getUserProfile, getCachedActiveVersionId } from "@/lib/supabase/cached-queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchProgressDetail } from "@/app/(authenticated)/contents/_lib/progress-detail"
import { ProgressDetailView } from "@/app/(authenticated)/contents/_components/progress-detail-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ManagerUserProgressPage({ params }: PageProps) {
  const { id } = await params

  const { user } = await getAuthUser()
  if (!user) redirect("/auth/login")

  const currentProfile = await getUserProfile(user.id)
  if (!currentProfile || currentProfile.role !== "manager") redirect("/dashboard")

  const adminClient = createAdminClient()

  // ユーザープロフィールとバージョンIDを並列取得
  const [targetProfileResult, activeVersionId] = await Promise.all([
    adminClient.from("profiles").select("default_genre, full_name").eq("id", id).single(),
    getCachedActiveVersionId(),
  ])

  const profile = targetProfileResult.data
  if (!profile) notFound()

  const genre = profile.default_genre
  if (!genre || !activeVersionId) {
    return (
      <ProgressDetailView
        tutorials={[]}
        backHref={`/users/${id}`}
        backLabel="教材進捗詳細"
      />
    )
  }

  const tutorials = await fetchProgressDetail(adminClient, id, genre, activeVersionId)

  return (
    <ProgressDetailView
      tutorials={tutorials}
      backHref={`/users/${id}`}
      backLabel="教材進捗詳細"
    />
  )
}
