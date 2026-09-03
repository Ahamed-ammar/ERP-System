import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    isolate: true,
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/scripts/**',
        'src/tests/**',
        'src/config/database.js',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
      }
    },
    include: ['src/tests/**/*.test.js'],
    testTimeout: 30_000,
  }
});
