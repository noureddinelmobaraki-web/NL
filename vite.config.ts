import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  return {
    // Default to the GitHub Pages sub-path so local/preview builds match production
    // and the service worker scope (/NL/). CI still overrides via VITE_BASE_PATH.
    base: process.env.VITE_BASE_PATH ?? '/NL/',
    assetsInclude: ['**/*.xml'],
    plugins: [
      react({
        babel: { plugins: [['babel-plugin-react-compiler', { target: '19' }]] }
      }),
      tailwindcss(),
      mode === 'analyze' && visualizer({
        open: false,
        filename: 'stats.html',
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2020',
      cssCodeSplit: true,
      minify: 'esbuild',
      sourcemap: 'hidden',
      reportCompressedSize: true,
      chunkSizeWarningLimit: 800,
      assetsInlineLimit: 0,
      modulePreload: {
        polyfill: false
      },
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('@supabase/supabase-js'))       return 'supabase';
            if (id.includes('node_modules/react-dom'))      return 'react-dom';
            if (id.includes('node_modules/react'))          return 'react-core';
            if (id.includes('node_modules/framer-motion'))  return 'framer';
            if (id.includes('node_modules/hls.js'))         return 'hls';
            if (id.includes('src/components/Drawings/'))    return 'drawings';
            if (id.includes('src/components/lyrics/'))      return 'lyrics';
            if (id.includes('src/components/MusicMood/'))   return 'music-mood';
            if (id.includes('src/components/songs/'))       return 'songs-ui';
            return undefined;
          }
        }
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    test: {
      environment: 'jsdom',
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', '**/e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        exclude: ['**/*.config.*', '**/dist/**', '**/e2e/**', '**/*.d.ts', 'scripts/**', 'server.ts', '**/*.test.*'],
        thresholds: { lines: 70, functions: 70, statements: 70, branches: 60 },
      }
    }
  };
});
