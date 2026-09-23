import { defineConfig } from 'vitest/config'

// vite.config.ts 의 Cloudflare 플러그인은 테스트에 불필요 (순수 규칙 테스트용)
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
