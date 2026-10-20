import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves the app from /<repo>/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/pdf-insight-api/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
  },
})
