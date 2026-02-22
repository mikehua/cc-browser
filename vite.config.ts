import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base path ensures portability on Cloudflare Pages
export default defineConfig({
  plugins: [react()],
  base: './', 
})
