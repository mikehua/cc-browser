import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Optimized for GitHub Pages subfolder
export default defineConfig({
  plugins: [react()],
  base: '/cc-browser/', 
})
