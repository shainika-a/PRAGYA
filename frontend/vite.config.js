import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend allows CORS from http://localhost:5173 and http://127.0.0.1:5173 (see backend/main.py),
// so the dev server must run on port 5173.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
})
