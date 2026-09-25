import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webDir = fileURLToPath(new URL('./', import.meta.url))   // ESM 下无 __dirname

export default defineConfig({
  base: '/llm-city/',
  server: { port: 5173, fs: { allow: [resolve(webDir, '..')] } },   // 允许 import 根级 lib/（仓库根即可，Task 12 审查回灌收紧）
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
})
