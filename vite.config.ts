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
  // TauriのWebViewでアセット（JS/CSS）を相対パスで確実に読み込ませる設定
  base: './',
  build: {
    rollupOptions: {
      input: {
        // 客側Webアプリ
        main: resolve(__dirname, 'index.html'),
        // 🚀 スタッフ用デスクトップアプリ（これでdistに出力される！）
        staff: resolve(__dirname, 'staff.html'),
      },
    },
  },
})