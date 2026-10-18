import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173,
    allowedHosts: true, // Allow custom hostnames and mobile dev test
  },
})
