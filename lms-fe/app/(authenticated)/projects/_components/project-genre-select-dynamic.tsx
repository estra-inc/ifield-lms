"use client"

import dynamic from "next/dynamic"

const ProjectGenreSelect = dynamic(
  () =>
    import("./project-genre-select").then((mod) => ({
      default: mod.ProjectGenreSelect,
    })),
  { ssr: false }
)

interface ProjectGenreSelectDynamicProps {
  currentGenre: string
  defaultGenre: string
}

export function ProjectGenreSelectDynamic({
  currentGenre,
  defaultGenre,
}: ProjectGenreSelectDynamicProps) {
  return (
    <ProjectGenreSelect
      currentGenre={currentGenre}
      defaultGenre={defaultGenre}
    />
  )
}
