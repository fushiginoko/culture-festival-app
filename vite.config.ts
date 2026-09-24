import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  base: './',
  build: {
    rollupOptions: {
      input: {
        // 客側Webアプリ
        main: resolve(__dirname, 'index.html'),
        // スタッフ用デスクトップアプリ
        staff: resolve(__dirname, 'staff.html'),
      },
    },
  },
})
