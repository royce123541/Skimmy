import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import jsdoc from 'eslint-plugin-jsdoc'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// These limits mirror the project coding standards (docs/adr/0001-stack-and-standards.md).
const MAX_FUNCTION_LINES = 50
const MAX_NESTING_DEPTH = 3

export default defineConfig([
  globalIgnores([
    '.output/',
    '.wxt/',
    'node_modules/',
    'playwright-report/',
    'test-results/',
    'coverage/',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `const { omitted: _omitted, ...rest } = value` is the immutable way to drop a key.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
      'max-lines-per-function': [
        'error',
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true },
      ],
      'max-depth': ['error', MAX_NESTING_DEPTH],
      'no-param-reassign': ['error', { props: true }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Exported APIs carry JSDoc (@param, @returns); types come from TypeScript, not JSDoc.
    files: ['src/**/*.{ts,tsx}'],
    extends: [jsdoc.configs['flat/recommended-typescript-error']],
    rules: {
      // One blank line between the description and the first tag, as in TSDoc.
      'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
      // Destructured props are documented on their interface, not per field.
      'jsdoc/require-param': ['error', { checkDestructured: false }],
      'jsdoc/check-param-names': ['error', { checkDestructured: false }],
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            FunctionExpression: true,
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            MethodDefinition: true,
          },
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    // Entrypoints and config files need default exports; shared code uses named exports.
    files: ['src/components/**', 'src/hooks/**', 'src/lib/**', 'src/types/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use a named export (project coding standards).',
        },
      ],
    },
  },
  {
    // describe() blocks group many cases, and fixtures use literal values on purpose.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
    },
  },
  prettier,
])
