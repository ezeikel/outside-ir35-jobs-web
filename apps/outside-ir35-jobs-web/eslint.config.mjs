import path from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import typescriptEslint from 'typescript-eslint';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import { rules as prettierConfigRules } from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export const projectRoot = path.resolve('.');
export const gitignorePath = path.resolve(projectRoot, '.gitignore');

const jsConfig = [
  // eslint recommended rules
  {
    name: 'js/config',
    ...js.configs.recommended,
  },
  // stylistic plugin
  plugins.stylistic,
  // import x plugin
  plugins.importX,
  // airbnb base recommended config
  ...configs.base.recommended,
];

const nextConfig = [
  // react plugin
  plugins.react,
  // react hooks plugin
  plugins.reactHooks,
  // react jsx a11y plugin
  plugins.reactA11y,
  // next plugin
  plugins.next,
  // airbnb next recommended config
  ...configs.next.recommended,
];

const typescriptConfig = [
  // typescript eslint plugin
  plugins.typescriptEslint,
  // airbnb base typescript config
  ...configs.base.typescript,
  // airbnb next typescript config
  ...configs.next.typescript,
];

const prettierConfig = [
  // prettier plugin
  {
    name: 'prettier/plugin/config',
    plugins: {
      prettier: prettierPlugin,
    },
  },
  // prettier config
  {
    name: 'prettier/config',
    rules: {
      ...prettierConfigRules,
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/require-default-props': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/ui/**', 'next-auth.d.ts'],
    rules: {
      'react/function-component-definition': 'off',
    },
  },
  {
    files: ['**/ui/**'],
    rules: {
      'arrow-body-style': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'import-x/prefer-default-export': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-arrow-callback': 'off',
    },
  },
];

export default [
  // ignore .gitignore files/folder in eslint
  includeIgnoreFile(gitignorePath),
  // javascript config
  ...jsConfig,
  // next config
  ...nextConfig,
  // typescript config
  ...typescriptConfig,
  // prettier config
  ...prettierConfig,
  // JS/MJS/MTS config files (next.config.mjs, vitest.config.mts,
  // postcss.config.mjs, eslint.config.mjs): run in Node and are NOT part of the
  // TS project service, so disable type-aware rules and give them node globals.
  // (.ts config files like sentry.*.config.ts ARE in the project — left alone.)
  {
    files: ['**/*.{js,mjs,cjs,mts}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
      },
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
    rules: {
      ...typescriptEslint.configs.disableTypeChecked.rules,
      'no-undef': 'off',
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
];
