import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─── 安全响应头 ────────────────────────────────────────────────
// 在开发/预览服务器中注入安全 Header，生产环境请在 Nginx/CDN 层同步配置
const securityHeaders = [
  // 防止 MIME 类型嗅探攻击
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 防止点击劫持（禁止嵌入 iframe）
  { key: 'X-Frame-Options', value: 'DENY' },
  // 跨域策略：仅允许同源策略
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Referrer 策略：跨域请求不携带完整 URL
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 权限策略：关闭不需要的浏览器能力
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // HSTS：强制 HTTPS（仅生产环境生效）
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // ─── Content Security Policy ─────────────────────────────────
  // default-src 'self'   → 仅允许同源资源
  // script-src           → 只允许同源脚本（Vite dev 需要 'unsafe-eval'）
  // style-src            → 允许内联样式（Tailwind 运行时需要）
  // img-src              → 允许同源 + data URI 图片
  // connect-src          → 允许同源 XHR/fetch，如有外部 API 需在此追加
  // frame-ancestors      → 禁止被任何页面嵌入
  // base-uri             → 防止 <base> 标签注入
  // form-action          → 表单只能提交到同源
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
]

export default defineConfig({
  plugins: [react()],

  server: {
    // 开发服务器注入安全 Header
    headers: Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value])),
  },

  preview: {
    // 预览服务器同样注入
    headers: Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value])),
  },

  build: {
    // 生产构建：启用代码分割 & 压缩
    sourcemap: false, // 生产环境不暴露 sourcemap，防止源码泄露
    rollupOptions: {
      output: {
        // 按模块分包，减少首屏加载体积
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})
