import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'cc-browser' with your actual repository name
export default defineConfig({
  plugins: [react()],
  base: '/cc-browser/', 
})
