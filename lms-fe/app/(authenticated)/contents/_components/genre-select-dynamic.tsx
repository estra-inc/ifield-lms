"use client"

import dynamic from "next/dynamic"

const GenreSelect = dynamic(
  () =>
    import("./genre-select").then((mod) => ({
      default: mod.GenreSelect,
    })),
  { ssr: false }
)

interface GenreSelectDynamicProps {
  currentGenre: string
  defaultGenre: string
}

export function GenreSelectDynamic({
  currentGenre,
  defaultGenre,
}: GenreSelectDynamicProps) {
  return <GenreSelect currentGenre={currentGenre} defaultGenre={defaultGenre} />
}
