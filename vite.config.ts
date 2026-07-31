import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base:   '/mia-reading/',
  // Honour an assigned PORT so the dev server can coexist with other projects
  // already holding 5173; falls back to the Vite default when unset.
  server: { host: true, port: Number(process.env.PORT) || 5173 },
})
