import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  return {
    base: process.env.VITE_BASE_PATH ?? '/',
    assetsInclude: ['**/*.xml'],
    plugins: [
      react(),
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
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
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
            if (id.includes('node_modules/react-dom'))      return 'react-dom';
            if (id.includes('node_modules/react'))          return 'react-core';
            if (id.includes('node_modules/framer-motion'))  return 'framer';
            if (id.includes('node_modules/hls.js'))         return 'hls';
            if (id.includes('node_modules/three'))          return 'three';
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
      environment: 'jsdom'
    }
  };
});
