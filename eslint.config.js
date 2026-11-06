import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...tseslint.configs.recommended[1].rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 180, skipBlankLines: true, skipComments: true }],
      'no-restricted-syntax': ['warn', {
        selector: "CallExpression[callee.object.name='useMusicStore'][callee.property.name='getState']",
        message: 'R01: استعمل useMusicStore((s) => s.tracks) بدل getState() داخل المكوّنات.',
      }],
    },
  },
  {
    files: ['src/features/liquid-glass/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Legacy effect-heavy files: keep exhaustive-deps off to avoid risky rewrites.
    files: [
      'src/components/Drawings/DrawingsFullscreen.tsx',
      'src/components/Lens/LensGallery.tsx',
      'src/components/Loading/LoadingScreen.tsx',
      'src/components/MySongs/MySongsPage.tsx',
      'src/components/RetroWorld/RetroWorldPage.tsx',
      'src/components/songs/LyricsDisplay.tsx',
      'src/hooks/useAudioController.ts',
      'src/hooks/useTouchGestures.ts'
    ],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    }
  }
);
