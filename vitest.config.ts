import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Tests never touch a real database or Planning Center: '@/lib/db' and
    // fetch are mocked per file. Fail fast if one forgets.
    env: { DATABASE_URL: 'postgres://tests-must-not-connect.invalid/none' },
  },
});
