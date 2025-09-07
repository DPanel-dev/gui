import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@renderer': resolve('src'),
      '@wails': resolve('./')
    }
  },
  plugins: [
    svgr({
      include: "**/*.svg",
      svgrOptions: {}
    }),
    react(),
    tailwindcss(),
  ]
})
