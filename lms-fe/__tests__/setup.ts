// jsdom 環境でのみポリフィルを適用
if (typeof globalThis.document !== "undefined") {
  // @testing-library/jest-dom のマッチャー拡張
  await import("@testing-library/jest-dom/vitest")

  // jsdom に存在しない API のポリフィル
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }

  // Dialog (Radix) が使う scrollTo のポリフィル
  if (typeof Element.prototype.scrollTo === "undefined") {
    Element.prototype.scrollTo = () => {}
  }
}
