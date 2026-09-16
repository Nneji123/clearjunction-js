import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // 'text' for local runs; 'lcov' and 'json' are consumed by Codecov in CI.
      reporter: ['text', 'lcov', 'json'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
      // Measure src/ only. This list replaces vitest's defaults, so every
      // non-source path is named explicitly.
      exclude: ['dist/**', 'docs/**', 'test/**', '**/*.config.ts', 'src/index.ts'],
    },
  },
});
