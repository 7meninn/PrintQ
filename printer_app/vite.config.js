import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: './', // Ensures assets load correctly in Electron
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5174,     // <--- Port set to 5174
    strictPort: true,
  }
})