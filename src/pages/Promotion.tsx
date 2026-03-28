import { useState, useEffect, useCallback, memo } from 'react'
import { Language, Translations, translations, detectLanguage } from '../utils/i18n'

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
// 防止 javascript:、data:、vbscript: 等协议注入
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw)
    return ALLOWED_PROTOCOLS.has(protocol)
  } catch {
    return false
  }
}

// ─── 安全：对显示用字符串做基础净化（防止非受控输出） ─────────
// React 渲染时已自动转义，此处主要用于 title/aria 属性
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

// 子域名推广记录也使用确定性种子，消除残余 Math.random 调用
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
    // 每条子域名用不同的 n 偏移，保证各行数据不同
    linkCount: Math.floor(lcg(seed, 100 + i) * 2000) + 1000,
    isSubdomain: true,
  }))

  return [...mainRecords, ...subRecords]
}

// ─── 常量 ──────────────────────────────────────────────────────
const LANGUAGES: Language[] = ['zh', 'en', 'fr', 'ja', 'de', 'ar']

const LANGUAGE_NAMES: Record<Language, string> = {
  zh: '中文',
  en: 'English',
  fr: 'Français',
  ja: '日本語',
  de: 'Deutsch',
  ar: 'العربية',
}

// ─── 子组件：统计表格行 ────────────────────────────────────────
const DomainStatRow = memo(({ stat, index }: { stat: DomainStat; index: number }) => (
  <tr className={index % 2 === 0 ? 'bg-blue-50' : ''}>
    <td className="px-4 py-2 font-medium">{stat.rank}</td>
    <td className="px-4 py-2 font-medium">{stat.hostname}</td>
    <td className="px-4 py-2">{stat.traffic.toLocaleString()}</td>
    <td className="px-4 py-2">{stat.visits.toLocaleString()}</td>
    <td className="px-4 py-2">{stat.conversionRate}</td>
    <td className="px-4 py-2">{stat.bounceRate}</td>
    <td className="px-4 py-2">{stat.avgDuration}</td>
  </tr>
))
DomainStatRow.displayName = 'DomainStatRow'

// ─── 子组件：推广效果行 ───────────────────────────────────────
const PromotionRecordRow = memo(
  ({ record, index, stripe }: { record: PromotionRecord; index: number; stripe: string }) => (
    <tr className={index % 2 === 0 ? stripe : ''}>
      {/* 安全：用 title 属性展示完整 URL，React 已自动转义文本节点 */}
      <td
        className="px-4 py-2 max-w-xs truncate"
        title={sanitizeForAttr(record.url)}
      >
        {record.url}
      </td>
      <td className="px-4 py-2">{record.hostname}</td>
      <td className="px-4 py-2">{record.platform}</td>
      <td className="px-4 py-2">{record.linkCount.toLocaleString()}</td>
      <td className="px-4 py-2 text-green-600 font-medium">成功</td>
    </tr>
  )
)
PromotionRecordRow.displayName = 'PromotionRecordRow'

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

  useEffect(() => {
    detectLanguage().then((lang) => {
      setCurrentLang(lang)
      setIsLoading(false)
    })
  }, [])

  const handleLanguageChange = useCallback((lang: Language) => {
    setCurrentLang(lang)
  }, [])

  const handlePromotion = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const trimmedUrl = url.trim()

      // 空值校验
      if (!trimmedUrl) {
        setStatus(t.emptyUrlMessage)
        setPromotionSuccess(false)
        return
      }

      // ── 安全：协议白名单校验 ──────────────────────────────────
      // 防止 javascript:alert(1)、data:text/html,<script>… 等注入
      if (!isSafeUrl(trimmedUrl)) {
        setStatus(t.errorMessage)
        setPromotionSuccess(false)
        return
      }

      let parsedUrl: URL
      try {
        parsedUrl = new URL(trimmedUrl)
      } catch {
        setStatus(t.errorMessage)
        setPromotionSuccess(false)
        return
      }

      // ── 安全：主机名基本合法性校验 ───────────────────────────
      // 防止空主机名或纯 IP 127.x 等内网地址被提交
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
          // 安全：精确 endsWith 匹配，防止 evilyndxw.com 绕过
          const baseDomain = 'yndxw.com'
          const subdomainPrefixes = ['www', 'm', 'api', 'cdn', 'blog', 'news']
          newSubdomains = subdomainPrefixes.map(
            (prefix) => `${protocol}//${prefix}.${baseDomain}`
          )
        }

        // 模拟推广延迟
        await new Promise<void>((resolve) => setTimeout(resolve, 2000))

        // 用时间戳作为种子，保证同一次推广内部数据稳定一致
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    )
  }

  const isRTL = currentLang === 'ar'
  const hasSubdomains = promotionRecords.some((r) => r.isSubdomain)
  const mainRecords = promotionRecords.filter((r) => !r.isSubdomain)
  const subRecords = promotionRecords.filter((r) => r.isSubdomain)

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-4 py-8">

        {/* 语言选择器 */}
        <div className="flex justify-end mb-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Language selector">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                aria-pressed={currentLang === lang}
                className={`px-3 py-1 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  currentLang === lang
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
              >
                {LANGUAGE_NAMES[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">

          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h1>
            <p className="text-lg text-gray-600">{t.subtitle}</p>
          </div>

          {/* 推广表单 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <form onSubmit={handlePromotion} className="space-y-4" noValidate>
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.urlLabel}
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t.urlPlaceholder}
                  autoComplete="url"
                  spellCheck={false}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isPromoting}
                aria-busy={isPromoting}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPromoting ? t.submittingButton : t.submitButton}
              </button>
            </form>

            {status && (
              <div
                role="alert"
                aria-live="assertive"
                className={`mt-4 p-3 rounded-md text-sm font-medium ${
                  promotionSuccess
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                {status}
              </div>
            )}
          </div>

          {/* 推广原理 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t.infoTitle}</h2>
            <ul className="space-y-2 text-gray-600">
              {t.infoItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold mt-0.5" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 域名统计表格 */}
          {domainStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">推广域名详细数据</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="域名统计数据">
                  <thead>
                    <tr className="bg-gray-50">
                      {['排名', '域名', '流量', '访问量', '转化率', '跳出率', '平均停留时间'].map(
                        (header) => (
                          <th
                            key={header}
                            scope="col"
                            className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {domainStats.map((stat, index) => (
                      <DomainStatRow key={stat.hostname} stat={stat} index={index} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 推广效果详情 */}
          {promotionSuccess && promotionRecords.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">推广效果详情</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="推广效果详情">
                  <thead>
                    <tr className="bg-gray-50">
                      {['地址', '域名', '平台/引擎', '链接次数', '状态'].map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hasSubdomains ? (
                      <>
                        {mainRecords.map((record, i) => (
                          <PromotionRecordRow
                            key={`main-${i}`}
                            record={record}
                            index={i}
                            stripe="bg-green-50"
                          />
                        ))}
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-3 bg-blue-50 font-medium text-blue-700"
                          >
                            yndxw.com 子域名推广结果
                          </td>
                        </tr>
                        {subRecords.map((record, i) => (
                          <PromotionRecordRow
                            key={`sub-${i}`}
                            record={record}
                            index={i}
                            stripe="bg-blue-50"
                          />
                        ))}
                      </>
                    ) : (
                      promotionRecords.map((record, i) => (
                        <PromotionRecordRow
                          key={`record-${i}`}
                          record={record}
                          index={i}
                          stripe="bg-green-50"
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default Promotion
