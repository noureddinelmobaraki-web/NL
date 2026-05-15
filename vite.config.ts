import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(({ mode }) => {
  return {
    base: '/nradio/',
    plugins: [
      react(), 
      tailwindcss(),
      compression({
        algorithms: ['brotliCompress'],
        exclude: [/\.(br)$/, /\.(gz)$/],
        deleteOriginalAssets: false
      }),
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
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react')) return 'react-vendor';
            if (id.includes('node_modules/framer-motion')) return 'framer';
            if (id.includes('src/components/DrawingsPage')) return 'drawings';
            if (id.includes('src/components/Sarahni')) return 'sarahni';
            if (id.includes('src/components/LyricsEngine')) return 'lyrics';
            return undefined;
          }
        }
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
