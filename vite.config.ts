import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using relative base path to make it work on any GitHub Pages subfolder
export default defineConfig({
  plugins: [react()],
  base: './', 
})
