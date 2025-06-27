import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@monaco-editor/react', 'monaco-editor'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor', '@monaco-editor/react'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://docvault-hzj4.onrender.com',
        changeOrigin: true,
      },
    },
  },
  worker: {
    format: 'es',
  },
});