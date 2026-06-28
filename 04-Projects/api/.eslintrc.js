module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // Enforce hexagonal architecture: domain and application layers must not import infrastructure or NestJS
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['*/infrastructure/*', '*/infrastructure'],
            message: 'Domain and application layers must not import from infrastructure.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Infrastructure and interface layers are allowed to import from anywhere
      files: ['src/**/infrastructure/**/*.ts', 'src/**/interface/**/*.ts', 'src/config/**/*.ts', 'src/app.module.ts', 'src/main.ts', 'src/database/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
