import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Optimized for Custom Root Domain (mikehua.com)
export default defineConfig({
  plugins: [react()],
  base: '/', 
})
