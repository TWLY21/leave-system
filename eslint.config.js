const js = require('@eslint/js');
const vuePlugin = require('eslint-plugin-vue');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'backend/data/**/*.sqlite',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  js.configs.recommended,
  ...vuePlugin.configs['flat/recommended'],
  {
    files: [
      'backend/**/*.js',
      'backend/tests/**/*.js',
      'e2e/**/*.js',
      'playwright*.js',
      'eslint.config.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ['frontend/**/*.js', 'frontend/**/*.vue'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    }
  },
  {
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off'
    }
  }
];
