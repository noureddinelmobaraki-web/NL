import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { ALL_SERVER_FRAME_ORIGINS } from './src/config/servers';
import { createCinemaDownloadBridgeMiddleware } from './src/features/cinemaDownload/serverBridgeMiddleware';

export default defineConfig(({ mode }) => {
  return {
    // Default to the GitHub Pages sub-path so local/preview builds match production
    // and the service worker scope (/NL/). CI still overrides via VITE_BASE_PATH.
    base: process.env.VITE_BASE_PATH ?? '/NL/',
    assetsInclude: ['**/*.xml'],
    plugins: [
      {
        name: 'cinema-download-bridge-plugin',
        configureServer(server: ViteDevServer) {
          if (process.env.CINEMA_BRIDGE_MOUNTED !== '1') {
            server.middlewares.use(createCinemaDownloadBridgeMiddleware());
          }
        },
        configurePreviewServer(server: PreviewServer) {
          if (process.env.CINEMA_BRIDGE_MOUNTED !== '1') {
            server.middlewares.use(createCinemaDownloadBridgeMiddleware());
          }
        },
      },
      {
        name: 'sync-cinema-csp-frame-src',
        transformIndexHtml(html: string) {
          return html.replace(/frame-src\s+([^;]+);/, (_match, directives: string) => {
            const existing = directives.trim().split(/\s+/);
            const merged = Array.from(new Set([...existing, ...ALL_SERVER_FRAME_ORIGINS]));
            return `frame-src ${merged.join(' ')};`;
          });
        },
      },
      {
        name: 'dev-csp-relax',
        apply: 'serve' as const,
        transformIndexHtml(html: string) {
          return html.replace(
            /script-src\s+'self'/,
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
          );
        },
      },
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
    esbuild: {
      pure: mode === 'production' 
        ? ['console.log', 'console.debug', 'console.info', 'console.trace'] 
        : [],
      legalComments: 'none',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2020',
      cssCodeSplit: true,
      minify: 'esbuild',
      // لا توجد أداة تتبّع أخطاء تستهلك الخرائط، ولا خطوة ترفعها ثم تحذفها.
    // 'hidden' كان ينتج 7MB خرائط تُنشر للعموم على GitHub Pages.
    sourcemap: false,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 800,
      assetsInlineLimit: 2048,
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
            if (id.includes('node_modules/zustand'))        return 'zustand';
            if (id.includes('node_modules/framer-motion'))  return 'framer';
            if (id.includes('node_modules/hls.js'))         return 'hls';
            if (id.includes('node_modules/jszip'))          return 'jszip';
            if (id.includes('node_modules/gsap'))           return 'gsap';
            if (id.includes('src/components/Drawings/'))    return 'drawings';
            if (id.includes('src/components/lyrics/'))      return 'lyrics';
            if (id.includes('src/components/songs/'))       return 'songs-ui';
            if (id.includes('src/features/portrait/'))     return 'portrait';
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
      setupFiles: ['./src/test/setup.ts'],
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
