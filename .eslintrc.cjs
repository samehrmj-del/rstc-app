module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['error', 'warn', 'log'] }],
    'no-return-await': 'error',
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn',
    'template-curly-spacing': 'error',
    'no-useless-catch': 'error',
    'no-useless-concat': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-path-concat': 'error',
    'eqeqeq': ['error', 'smart'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'no-misleading-character-class': 'off',
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: 'directive', next: '*' },
      { blankLine: 'any', prev: 'export', next: 'export' },
      { blankLine: 'always', prev: 'block-like', next: '*' },
    ],
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
  ],
};
