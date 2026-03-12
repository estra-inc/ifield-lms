import { redirect } from "next/navigation"
import { getAuthUser, getUserProfile, getCachedActiveVersionId } from "@/lib/supabase/cached-queries"
import { fetchProgressDetail } from "../_lib/progress-detail"
import { ProgressDetailView } from "../_components/progress-detail-view"

export default async function ContentsProgressPage() {
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)

  const genre = profile?.default_genre
  if (!genre) {
    return (
      <ProgressDetailView
        tutorials={[]}
        backHref="/dashboard"
        backLabel="教材進捗詳細"
      />
    )
  }

  const activeVersionId = await getCachedActiveVersionId()
  if (!activeVersionId) {
    return (
      <ProgressDetailView
        tutorials={[]}
        backHref="/dashboard"
        backLabel="教材進捗詳細"
      />
    )
  }

  const tutorials = await fetchProgressDetail(
    supabase,
    user.id,
    genre,
    activeVersionId
  )

  return (
    <ProgressDetailView
      tutorials={tutorials}
      backHref="/dashboard"
      backLabel="教材進捗詳細"
    />
  )
}
