/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_VERSION: string
  readonly VITE_NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    accept(): void
    accept(cb: () => void): void
    accept(dep: string, cb: () => void): void
    accept(deps: string[], cb: () => void): void
    dispose(cb: () => void): void
    prune(cb: () => void): void
    invalidate(): void
    on(event: string, cb: () => void): void
  }
}