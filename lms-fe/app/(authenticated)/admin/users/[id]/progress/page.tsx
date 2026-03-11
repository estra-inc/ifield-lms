import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveVersionId } from "@/lib/supabase/content-version"
import { fetchProgressDetail } from "@/app/(authenticated)/contents/_lib/progress-detail"
import { ProgressDetailView } from "@/app/(authenticated)/contents/_components/progress-detail-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserProgressPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!currentProfile || currentProfile.role !== "super_admin") {
    redirect("/dashboard")
  }

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from("profiles")
    .select("default_genre, full_name")
    .eq("id", id)
    .single()

  if (!profile) {
    notFound()
  }

  const genre = profile.default_genre
  if (!genre) {
    return (
      <ProgressDetailView
        tutorials={[]}
        backHref={`/admin/users/${id}`}
        backLabel="教材進捗詳細"
      />
    )
  }

  const activeVersionId = await getActiveVersionId(adminClient)
  if (!activeVersionId) {
    return (
      <ProgressDetailView
        tutorials={[]}
        backHref={`/admin/users/${id}`}
        backLabel="教材進捗詳細"
      />
    )
  }

  const tutorials = await fetchProgressDetail(
    adminClient,
    id,
    genre,
    activeVersionId
  )

  return (
    <ProgressDetailView
      tutorials={tutorials}
      backHref={`/admin/users/${id}`}
      backLabel="教材進捗詳細"
    />
  )
}
