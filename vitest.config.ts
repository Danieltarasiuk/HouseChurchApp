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
    // The database tests run Postgres in-process (PGlite, WebAssembly), so
    // they are CPU-bound: the slowest (isolation.test.ts, every read route
    // per role) takes ~3.5s on an idle machine, and Vitest's 5s default
    // failed it whenever the CPU was shared (a dev server compiling, a busy
    // CI runner). A timed-out test also keeps running on the shared
    // connection, so its leftover queries then break the next test with
    // 'savepoint "app_tx_N" does not exist'. Real hangs still fail, just
    // later.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
