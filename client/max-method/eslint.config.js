import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import testingLibrary from 'eslint-plugin-testing-library'
import jestDom from 'eslint-plugin-jest-dom'
import vitest from '@vitest/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // Base config — applies to all JS/JSX source files.
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // Test-file overlay — applies ONLY to *.test.{js,jsx}.
  //
  // Three plugins on their recommended presets per
  // docs/decisions.md#test-lint-plugins. Scoped via the `files` pattern
  // so production code is unaffected. Vitest globals (describe, it,
  // expect, vi, ...) declared as readonly so the base rules don't flag
  // them as undefined references.
  //
  // @vitest/eslint-plugin is the actively-maintained successor to the
  // stale `eslint-plugin-vitest@0.5.4` originally named in the plan;
  // see docs/decisions.md#test-lint-plugins for the substitution note.
  {
    files: ['**/*.test.{js,jsx}'],
    plugins: {
      'testing-library': testingLibrary,
      'jest-dom': jestDom,
      vitest,
    },
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      ...jestDom.configs['flat/recommended'].rules,
      ...vitest.configs.recommended.rules,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        // Vitest globals — present at runtime via `globals: true` in
        // vitest.config.js. Declared here so eslint doesn't flag them
        // as undefined.
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        suite: 'readonly',
      },
    },
  },
])
