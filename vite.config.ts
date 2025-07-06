import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@monaco-editor/react', 'monaco-editor', 'react', 'react-dom', 'react-router-dom'],
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor', '@monaco-editor/react'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'ui-libs': ['lucide-react', 'clsx', 'react-hot-toast'],
          'pdf-libs': ['jspdf', 'html2pdf.js', 'html2canvas'],
          'file-libs': ['file-saver', 'docx'],
          'utils': ['axios', 'date-fns', 'socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
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