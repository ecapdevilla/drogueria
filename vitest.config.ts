import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Las pruebas siempre usan el modo local, aunque `.env.local` esté en cloud.
    env: {
      VITE_DATA_MODE: 'local',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**/*.ts', 'src/domain/**/*.ts', 'src/utils/**/*.ts'],
      exclude: ['src/services/seed.service.ts'],
    },
  },
});
