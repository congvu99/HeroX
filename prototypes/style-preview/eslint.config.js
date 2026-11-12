// Bản xem phong cách là JS chạy trên trình duyệt, tách khỏi cấu hình type-checked của monorepo.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['public/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
    rules: { eqeqeq: ['error', 'always'], 'no-console': 'error' },
  },
];
