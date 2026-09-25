import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webDir = fileURLToPath(new URL('./', import.meta.url))   // ESM 下无 __dirname

export default defineConfig({
  base: '/llm-city/',
  server: { port: 5173, fs: { allow: [resolve(webDir, '../..')] } },   // 允许 import cities/ 与 lib/
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
})
