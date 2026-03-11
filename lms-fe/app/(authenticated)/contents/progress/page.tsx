import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveVersionId } from "@/lib/supabase/content-version"
import { fetchProgressDetail } from "../_lib/progress-detail"
import { ProgressDetailView } from "../_components/progress-detail-view"

export default async function ContentsProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_genre")
    .eq("id", user.id)
    .single()

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

  const activeVersionId = await getActiveVersionId(supabase)
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
