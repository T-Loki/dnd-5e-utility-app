import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/dnd-5e-utility-app/',
  plugins: [react()],
});
