import { useState, useEffect, useCallback, memo } from 'react'
import {
  Language,
  Translations,
  translations,
  detectLanguage,
  saveLanguagePreference,
  RTL_LANGUAGES,
} from '../utils/i18n'

// ─── 类型定义 ─────────────────────────────────────────────────
interface DomainStat {
  rank: number
  hostname: string
  traffic: number
  visits: number
  conversionRate: string
  bounceRate: string
  avgDuration: string
}

interface PromotionRecord {
  url: string
  hostname: string
  platform: string
  linkCount: number
  isSubdomain?: boolean
}

// ─── 安全：允许的 URL 协议白名单 ─────────────────────────────
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw)
    return ALLOWED_PROTOCOLS.has(protocol)
  } catch {
    return false
  }
}

// ─── 安全：属性值 HTML 转义（防 XSS） ─────────────────────────
function sanitizeForAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ─── 确定性伪随机（线性同余，避免 re-render 数据跳动） ───────
function lcg(seed: number, n: number): number {
  return ((seed * 9301 + 49297 * n) % 233280) / 233280
}

function generateDomainStat(hostname: string, rank: number, seed: number): DomainStat {
  return {
    rank,
    hostname,
    traffic: Math.floor(lcg(seed, 1) * 10000) + 5000,
    visits: Math.floor(lcg(seed, 2) * 5000) + 2000,
    conversionRate: (lcg(seed, 3) * 5 + 1).toFixed(1) + '%',
    bounceRate: (lcg(seed, 4) * 40 + 30).toFixed(1) + '%',
    avgDuration: `${Math.floor(lcg(seed, 5) * 3) + 1}:${Math.floor(lcg(seed, 6) * 59)
      .toString()
      .padStart(2, '0')}`,
  }
}

function generatePromotionRecords(
  url: string,
  hostname: string,
  subdomains: string[],
  seed: number
): PromotionRecord[] {
  const platforms = ['百度', '微信', '微博', '抖音', 'Google', 'Facebook']
  const linkCounts = [3567, 4231, 2890, 5123, 1245, 2341]

  const mainRecords: PromotionRecord[] = platforms.map((platform, i) => ({
    url,
    hostname,
    platform,
    linkCount: linkCounts[i],
    isSubdomain: false,
  }))

  const subRecords: PromotionRecord[] = subdomains.map((subdomain, i) => ({
    url: subdomain,
    hostname: new URL(subdomain).hostname,
    platform: '百度',
    linkCount: Math.floor(lcg(seed, 100 + i) * 2000) + 1000,
    isSubdomain: true,
  }))

  return [...mainRecords, ...subRecords]
}

// ─── 常量 ──────────────────────────────────────────────────────
const LANGUAGES: Language[] = ['zh', 'en', 'fr', 'de', 'ja', 'ar']

const LANGUAGE_NAMES: Record<Language, string> = {
  zh: '中文',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ar: 'العربية',
}

// ─── 子组件：统计表格行 ────────────────────────────────────────
const DomainStatRow = memo(({ stat, index }: { stat: DomainStat; index: number }) => (
  <tr className={index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}>
    <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{stat.rank}</td>
    <td className="px-3 py-2 font-medium text-blue-600 dark:text-blue-400 break-all">{stat.hostname}</td>
    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{stat.traffic.toLocaleString()}</td>
    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{stat.visits.toLocaleString()}</td>
    <td className="px-3 py-2 text-green-600 dark:text-green-400 whitespace-nowrap">{stat.conversionRate}</td>
    <td className="px-3 py-2 text-orange-500 dark:text-orange-400 whitespace-nowrap">{stat.bounceRate}</td>
    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{stat.avgDuration}</td>
  </tr>
))
DomainStatRow.displayName = 'DomainStatRow'

// ─── 子组件：推广效果行 ───────────────────────────────────────
const PromotionRecordRow = memo(
  ({ record, index, stripe }: { record: PromotionRecord; index: number; stripe: string }) => (
    <tr className={index % 2 === 0 ? stripe : 'bg-white dark:bg-gray-800'}>
      <td
        className="px-3 py-2 max-w-[160px] sm:max-w-xs truncate text-gray-700 dark:text-gray-300"
        title={sanitizeForAttr(record.url)}
      >
        {record.url}
      </td>
      <td className="px-3 py-2 text-blue-600 dark:text-blue-400 break-all">{record.hostname}</td>
      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{record.platform}</td>
      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{record.linkCount.toLocaleString()}</td>
      <td className="px-3 py-2 text-green-600 dark:text-green-400 font-medium whitespace-nowrap">✓</td>
    </tr>
  )
)
PromotionRecordRow.displayName = 'PromotionRecordRow'

// ─── 响应式滚动表格容器 ───────────────────────────────────────
function ScrollTable({
  ariaLabel,
  headers,
  children,
}: {
  ariaLabel: string
  headers: string[]
  children: React.ReactNode
}) {
  return (
    // -webkit-overflow-scrolling: touch → iOS Safari 惯性滚动
    <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg" style={{ WebkitOverflowScrolling: 'touch' }}>
      <table
        className="min-w-full text-sm border-collapse"
        aria-label={ariaLabel}
      >
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{children}</tbody>
      </table>
    </div>
  )
}

// ─── 主组件 ────────────────────────────────────────────────────
const Promotion: React.FC = () => {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('')
  const [isPromoting, setIsPromoting] = useState(false)
  const [currentLang, setCurrentLang] = useState<Language>('zh')
  const [isLoading, setIsLoading] = useState(true)
  const [promotionSuccess, setPromotionSuccess] = useState(false)
  const [domainStats, setDomainStats] = useState<DomainStat[]>([])
  const [promotionRecords, setPromotionRecords] = useState<PromotionRecord[]>([])

  const t: Translations = translations[currentLang]
  const isRTL = RTL_LANGUAGES.has(currentLang)

  // 初始化：检测语言，同步 HTML dir 属性
  useEffect(() => {
    detectLanguage().then((lang) => {
      setCurrentLang(lang)
      setIsLoading(false)
    })
  }, [])

  // 切换语言时更新 HTML lang + dir 属性（影响整个文档）
  useEffect(() => {
    document.documentElement.lang = currentLang
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [currentLang, isRTL])

  const handleLanguageChange = useCallback((lang: Language) => {
    setCurrentLang(lang)
    saveLanguagePreference(lang)
  }, [])

  const handlePromotion = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const trimmedUrl = url.trim()

      if (!trimmedUrl) {
        setStatus(t.emptyUrlMessage)
        setPromotionSuccess(false)
        return
      }

      // 安全：协议白名单校验
      if (!isSafeUrl(trimmedUrl)) {
        setStatus(t.invalidUrlMessage)
        setPromotionSuccess(false)
        return
      }

      let parsedUrl: URL
      try {
        parsedUrl = new URL(trimmedUrl)
      } catch {
        setStatus(t.invalidUrlMessage)
        setPromotionSuccess(false)
        return
      }

      const hostname = parsedUrl.hostname
      if (!hostname || hostname.length > 253) {
        setStatus(t.errorMessage)
        setPromotionSuccess(false)
        return
      }

      setIsPromoting(true)
      setStatus(t.submittingButton)
      setPromotionSuccess(false)
      setDomainStats([])
      setPromotionRecords([])

      try {
        const protocol = parsedUrl.protocol
        let newSubdomains: string[] = []

        if (hostname.endsWith('yndxw.com')) {
          const baseDomain = 'yndxw.com'
          const subdomainPrefixes = ['www', 'm', 'api', 'cdn', 'blog', 'news']
          newSubdomains = subdomainPrefixes.map(
            (prefix) => `${protocol}//${prefix}.${baseDomain}`
          )
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 2000))

        const seed = Date.now()
        const allHostnames = [hostname, ...newSubdomains.map((s) => new URL(s).hostname)]
        const stats = allHostnames.map((h, i) => generateDomainStat(h, i + 1, seed + i))
        const records = generatePromotionRecords(trimmedUrl, hostname, newSubdomains, seed)

        setDomainStats(stats)
        setPromotionRecords(records)
        setStatus(t.successMessage)
        setPromotionSuccess(true)
      } catch {
        setStatus(t.errorMessage)
        setPromotionSuccess(false)
      } finally {
        setIsPromoting(false)
      }
    },
    [url, t]
  )

  // ── Loading 状态 ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          {/* 旋转加载圈 */}
          <svg
            className="w-10 h-10 animate-spin text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-gray-500 dark:text-gray-400 text-lg">Loading…</span>
        </div>
      </div>
    )
  }

  const hasSubdomains = promotionRecords.some((r) => r.isSubdomain)
  const mainRecords = promotionRecords.filter((r) => !r.isSubdomain)
  const subRecords = promotionRecords.filter((r) => r.isSubdomain)
  const statHeaders = [
    t.tableStats.rank,
    t.tableStats.domain,
    t.tableStats.traffic,
    t.tableStats.visits,
    t.tableStats.conversion,
    t.tableStats.bounce,
    t.tableStats.duration,
  ]
  const promoHeaders = [
    t.tablePromotion.address,
    t.tablePromotion.domain,
    t.tablePromotion.platform,
    t.tablePromotion.linkCount,
    t.tablePromotion.status,
  ]

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${
        isRTL ? 'rtl' : 'ltr'
      }`}
    >
      {/* ── 顶部导航栏 ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Logo / 标题 */}
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-7 h-7 text-blue-500 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">
              {t.title}
            </span>
          </div>

          {/* 语言选择器 */}
          <nav
            className="flex flex-wrap gap-1 sm:gap-1.5 justify-end"
            role="group"
            aria-label={t.langLabel}
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                aria-pressed={currentLang === lang}
                className={`
                  px-2 py-1 rounded text-xs sm:text-sm font-medium
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
                  active:scale-95
                  ${
                    currentLang === lang
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent hover:border-blue-300'
                  }
                `}
              >
                {LANGUAGE_NAMES[lang]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── 主内容区 ───────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">

        {/* Hero 区域 */}
        <section className="text-center px-2" aria-labelledby="hero-title">
          <h1
            id="hero-title"
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight"
          >
            {t.title}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </section>

        {/* 推广表单 */}
        <section
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-5 sm:p-8"
          aria-label="promotion form"
        >
          <form onSubmit={handlePromotion} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="url-input"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
              >
                {t.urlLabel}
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  id="url-input"
                  name="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t.urlPlaceholder}
                  autoComplete="url"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  inputMode="url"
                  // iOS Safari 输入法优化
                  enterKeyHint="go"
                  className="
                    flex-1 px-4 py-3 text-base
                    border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-900
                    text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-500
                    rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    transition-shadow duration-150
                    min-h-[48px]
                  "
                />
                <button
                  type="submit"
                  disabled={isPromoting}
                  aria-busy={isPromoting}
                  className="
                    sm:w-auto w-full px-6 py-3 min-h-[48px]
                    bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    text-white font-semibold text-base
                    rounded-xl shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                    transition-all duration-150 active:scale-[0.98]
                    whitespace-nowrap
                  "
                >
                  {isPromoting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {t.submittingButton}
                    </span>
                  ) : (
                    t.submitButton
                  )}
                </button>
              </div>
            </div>

            {/* 状态提示 */}
            {status && (
              <div
                role="alert"
                aria-live="assertive"
                className={`
                  p-3.5 rounded-xl text-sm font-medium flex items-start gap-2
                  ${
                    promotionSuccess
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  }
                `}
              >
                <span aria-hidden="true">{promotionSuccess ? '✅' : '⚠️'}</span>
                <span>{status}</span>
              </div>
            )}
          </form>
        </section>

        {/* 推广原理卡片 */}
        <section
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-5 sm:p-8"
          aria-labelledby="info-title"
        >
          <h2
            id="info-title"
            className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4"
          >
            {t.infoTitle}
          </h2>
          {/* 响应式网格：手机1列 → 平板2列 */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
            {t.infoItems.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40"
              >
                <span
                  className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 域名统计表格 */}
        {domainStats.length > 0 && (
          <section
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-8"
            aria-labelledby="stats-title"
          >
            <h2
              id="stats-title"
              className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4"
            >
              {t.tableStats.title}
            </h2>
            <ScrollTable ariaLabel={t.tableStats.title} headers={statHeaders}>
              {domainStats.map((stat, index) => (
                <DomainStatRow key={stat.hostname} stat={stat} index={index} />
              ))}
            </ScrollTable>
          </section>
        )}

        {/* 推广效果详情 */}
        {promotionSuccess && promotionRecords.length > 0 && (
          <section
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-8"
            aria-labelledby="promo-title"
          >
            <h2
              id="promo-title"
              className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4"
            >
              {t.tablePromotion.title}
            </h2>
            <ScrollTable ariaLabel={t.tablePromotion.title} headers={promoHeaders}>
              {hasSubdomains ? (
                <>
                  {mainRecords.map((record, i) => (
                    <PromotionRecordRow
                      key={`main-${i}`}
                      record={record}
                      index={i}
                      stripe="bg-green-50 dark:bg-green-900/20"
                    />
                  ))}
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-700 dark:text-blue-400 text-sm"
                    >
                      {t.tablePromotion.subdomainLabel}
                    </td>
                  </tr>
                  {subRecords.map((record, i) => (
                    <PromotionRecordRow
                      key={`sub-${i}`}
                      record={record}
                      index={i}
                      stripe="bg-blue-50 dark:bg-blue-900/20"
                    />
                  ))}
                </>
              ) : (
                promotionRecords.map((record, i) => (
                  <PromotionRecordRow
                    key={`record-${i}`}
                    record={record}
                    index={i}
                    stripe="bg-green-50 dark:bg-green-900/20"
                  />
                ))
              )}
            </ScrollTable>
          </section>
        )}

      </main>

      {/* ── 页脚 ───────────────────────────────────────────────── */}
      <footer className="mt-10 border-t border-gray-200 dark:border-gray-700 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>Auto Promotion Tool · 跨平台多语言推广工具</p>
      </footer>
    </div>
  )
}

export default Promotion
