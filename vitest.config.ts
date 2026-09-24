import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'tools/**/*.test.ts', 'web/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
