import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base path is most robust for GitHub Pages and Cloudflare
export default defineConfig({
  plugins: [react()],
  base: './', 
})
