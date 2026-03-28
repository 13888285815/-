import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─── 安全响应头 ────────────────────────────────────────────────
const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self' https://cdn.tailwindcss.com",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.tailwindcss.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; '),
}

export default defineConfig({
  plugins: [react()],

  // ── 入口：使用 marketing.html 替代默认 index.html ──
  // Vite 会自动识别根目录下 .html 文件作为 MPA 入口
  root: '.',

  server: {
    headers: securityHeaders,
  },

  preview: {
    headers: securityHeaders,
  },

  build: {
    // 指定 marketing.html 作为唯一入口
    rollupOptions: {
      input: {
        main: 'marketing.html',
      },
      output: {
        // 代码分包：React vendor 单独打包，减少业务代码体积
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
        // 文件名哈希，配合 CDN 缓存
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    sourcemap: false, // 生产环境不暴露源码
  },
})
