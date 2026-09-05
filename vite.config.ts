import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [basicSsl()],
  server: {
    host: '0.0.0.0',
    watch: {
      ignored: ['**/.chrome-target-profile/**'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        ar: 'ar.html',
        targetCompiler: 'target-compiler.html',
      },
    },
  },
});
