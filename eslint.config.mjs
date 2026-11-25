import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * Next's recommended rules (core web vitals + TypeScript), run by `npm run
 * lint` and CI. Previously this file exported `[{}]`, which linted nothing.
 */
const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Explicit, so eslint-plugin-react skips version detection, which calls
    // an API ESLint 10 removed (context.getFilename).
    settings: { react: { version: '19.2' } },
  },
  {
    // Test plumbing wraps untyped driver results.
    files: ['tests/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    ignores: [
      '.next/**', 'node_modules/**', 'next-env.d.ts',
      // Untracked/legacy material, not part of the app build.
      'client/**', 'server/**', 'docs/**', 'incubator-preview.jsx',
    ],
  },
];

export default config;
