import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // 'text' for local runs, 'lcov' + 'json' for the Codecov upload in CI.
      reporter: ['text', 'lcov', 'json'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
      // Measure source only: vitest's default excludes are replaced wholesale by
      // this list, so test files must be named here or they self-cover at 100%
      // and inflate the totals past the threshold.
      exclude: ['dist/**', 'docs/**', 'test/**', '**/*.config.ts', 'src/index.ts'],
    },
  },
});
