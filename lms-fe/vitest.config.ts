import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    environmentMatchGlobs: [
      ["__tests__/components/**/*.test.tsx", "jsdom"],
      ["__tests__/hooks/**/*.test.ts", "jsdom"],
      ["__tests__/app/**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
