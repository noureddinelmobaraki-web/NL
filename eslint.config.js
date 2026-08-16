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
      'no-restricted-syntax': ['warn', {
        selector: "CallExpression[callee.object.name='useMusicStore'][callee.property.name='getState']",
        message: 'R01: استعمل useMusicStore((s) => s.tracks) بدل getState() داخل المكوّنات.',
      }],
      
    },
  },
  {
    // Legacy effect-heavy files: keep exhaustive-deps off to avoid risky rewrites.
    // TODO: These remaining high-risk files need dedicated file-specific tests before removal.
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
