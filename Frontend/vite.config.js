import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    allowedHosts: [
      "86fb0eb935a9.ngrok-free.app", // 👈 ton domaine ngrok
    ],
  },
})
