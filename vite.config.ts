import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(({ mode }) => {
  return {
    base: '/NL/',
    assetsInclude: ['**/*.xml'],
    plugins: [
      react(), 
      tailwindcss(),
      compression({
        algorithms: ['brotliCompress'],
        exclude: [/\.(br)$/, /\.(gz)$/],
        deleteOriginalAssets: false
      }),
      {
        name: 'exclude-xml-from-transform',
        transformIndexHtml: {
          enforce: 'pre' as const,
          transform(html: string, ctx: any) {
            if (ctx.filename?.endsWith('.xml')) return html;
            return html;
          }
        }
      },
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
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        }
      },
      cssCodeSplit: true,
      sourcemap: false,
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
            if (id.includes('node_modules/react-dom')) return 'react-dom';
            if (id.includes('node_modules/react'))     return 'react-core';
            if (id.includes('node_modules/framer-motion')) return 'framer';
            if (id.includes('node_modules/hls.js'))    return 'hls';
            if (id.includes('node_modules/three'))     return 'three';
            if (id.includes('src/components/DrawingsPage'))        return 'drawings';
            if (id.includes('src/components/LyricsEngine'))        return 'lyrics';
            if (id.includes('src/components/MusicMood'))           return 'music-mood';
            if (id.includes('src/components/songs/'))              return 'songs-ui';
            return undefined;
          }
        }
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    test: {
      environment: 'jsdom'
    }
  };
});
