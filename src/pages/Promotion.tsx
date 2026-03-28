import { useState, useEffect, useCallback, useRef, memo } from 'react'
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

interface UploadedFile {
  id: string
  file: File
  preview?: string   // 图片预览 data URL
}

// ─── 安全 ─────────────────────────────────────────────────────
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
function isSafeUrl(raw: string): boolean {
  try { return ALLOWED_PROTOCOLS.has(new URL(raw).protocol) } catch { return false }
}
function sanitizeForAttr(v: string) {
  return v.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
          .replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// ─── 确定性随机 ───────────────────────────────────────────────
function lcg(seed: number, n: number) { return ((seed*9301+49297*n)%233280)/233280 }
function generateDomainStat(hostname: string, rank: number, seed: number): DomainStat {
  return {
    rank, hostname,
    traffic: Math.floor(lcg(seed,1)*10000)+5000,
    visits: Math.floor(lcg(seed,2)*5000)+2000,
    conversionRate: (lcg(seed,3)*5+1).toFixed(1)+'%',
    bounceRate: (lcg(seed,4)*40+30).toFixed(1)+'%',
    avgDuration: `${Math.floor(lcg(seed,5)*3)+1}:${Math.floor(lcg(seed,6)*59).toString().padStart(2,'0')}`,
  }
}
function generatePromotionRecords(url:string,hostname:string,subdomains:string[],seed:number): PromotionRecord[] {
  const platforms=['百度','微信','微博','抖音','Google','Facebook']
  const linkCounts=[3567,4231,2890,5123,1245,2341]
  return [
    ...platforms.map((platform,i)=>({url,hostname,platform,linkCount:linkCounts[i],isSubdomain:false})),
    ...subdomains.map((s,i)=>({url:s,hostname:new URL(s).hostname,platform:'百度',linkCount:Math.floor(lcg(seed,100+i)*2000)+1000,isSubdomain:true})),
  ]
}

// ─── 工具函数：文件大小格式化 ─────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  if (bytes < 1024*1024*1024) return (bytes/1024/1024).toFixed(1) + ' MB'
  return (bytes/1024/1024/1024).toFixed(1) + ' GB'
}

// ─── 工具函数：根据文件类型返回图标 emoji ─────────────────────
function fileIcon(file: File): string {
  const t = file.type
  const n = file.name.toLowerCase()
  if (t.startsWith('image/')) return '🖼️'
  if (t.startsWith('video/')) return '🎬'
  if (t.startsWith('audio/')) return '🎵'
  if (t === 'application/pdf' || n.endsWith('.pdf')) return '📄'
  if (t.includes('word') || n.endsWith('.doc') || n.endsWith('.docx')) return '📝'
  if (t.includes('excel') || t.includes('spreadsheet') || n.endsWith('.xls') || n.endsWith('.xlsx') || n.endsWith('.csv')) return '📊'
  if (t.includes('powerpoint') || t.includes('presentation') || n.endsWith('.ppt') || n.endsWith('.pptx')) return '📊'
  if (t.includes('zip') || t.includes('compressed') || n.endsWith('.zip') || n.endsWith('.rar') || n.endsWith('.7z') || n.endsWith('.tar') || n.endsWith('.gz')) return '🗜️'
  if (t.includes('text') || n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.json') || n.endsWith('.xml') || n.endsWith('.yaml') || n.endsWith('.yml')) return '📃'
  if (n.endsWith('.js') || n.endsWith('.ts') || n.endsWith('.jsx') || n.endsWith('.tsx') || n.endsWith('.py') || n.endsWith('.java') || n.endsWith('.cpp') || n.endsWith('.c') || n.endsWith('.go') || n.endsWith('.rs')) return '💻'
  return '📁'
}

// ─── 常量 ─────────────────────────────────────────────────────
const LANGUAGES: Language[] = ['zh', 'en', 'fr', 'de', 'ja', 'ar']
const LANGUAGE_NAMES: Record<Language, string> = {
  zh:'中文', en:'English', fr:'Français', de:'Deutsch', ja:'日本語', ar:'العربية',
}

// ─── 子组件：统计行 ───────────────────────────────────────────
const DomainStatRow = memo(({stat,index}:{stat:DomainStat;index:number}) => (
  <tr className={index%2===0 ? 'bg-white/60' : 'bg-blue-50/60'}>
    <td className="px-3 py-2.5 font-semibold text-gray-500 text-center">{stat.rank}</td>
    <td className="px-3 py-2.5 font-medium text-blue-600 break-all">{stat.hostname}</td>
    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{stat.traffic.toLocaleString()}</td>
    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{stat.visits.toLocaleString()}</td>
    <td className="px-3 py-2.5 text-emerald-600 font-medium whitespace-nowrap">{stat.conversionRate}</td>
    <td className="px-3 py-2.5 text-amber-500 whitespace-nowrap">{stat.bounceRate}</td>
    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{stat.avgDuration}</td>
  </tr>
))
DomainStatRow.displayName = 'DomainStatRow'

const PromotionRecordRow = memo(({record,index,stripe}:{record:PromotionRecord;index:number;stripe:string}) => (
  <tr className={index%2===0 ? stripe : 'bg-white/60'}>
    <td className="px-3 py-2.5 max-w-[140px] sm:max-w-xs truncate text-gray-700" title={sanitizeForAttr(record.url)}>{record.url}</td>
    <td className="px-3 py-2.5 text-blue-600 break-all">{record.hostname}</td>
    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{record.platform}</td>
    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{record.linkCount.toLocaleString()}</td>
    <td className="px-3 py-2.5 whitespace-nowrap">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <span>✓</span><span>成功</span>
      </span>
    </td>
  </tr>
))
PromotionRecordRow.displayName = 'PromotionRecordRow'

// ─── 子组件：滚动表格容器 ─────────────────────────────────────
function ScrollTable({ariaLabel,headers,children}:{ariaLabel:string;headers:string[];children:React.ReactNode}) {
  return (
    <div className="overflow-x-auto -mx-1 rounded-xl" style={{WebkitOverflowScrolling:'touch'}}>
      <table className="min-w-full text-sm" aria-label={ariaLabel}>
        <thead>
          <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            {headers.map(h=>(
              <th key={h} scope="col" className="px-3 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

// ─── 子组件：文件上传区域 ─────────────────────────────────────
function FileUploadZone({
  uploadedFiles,
  onAdd,
  onRemove,
  onClear,
  t,
  isRTL,
}: {
  uploadedFiles: UploadedFile[]
  onAdd: (files: FileList) => void
  onRemove: (id: string) => void
  onClear: () => void
  t: Translations
  isRTL: boolean
}) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) onAdd(e.dataTransfer.files)
  }, [onAdd])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const totalSize = uploadedFiles.reduce((acc, f) => acc + f.file.size, 0)

  return (
    <div className="space-y-3">
      {/* 拖拽区 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        aria-label={t.uploadHint}
        className={`
          relative group cursor-pointer rounded-2xl border-2 border-dashed
          transition-all duration-200 select-none
          flex flex-col items-center justify-center gap-3
          py-10 px-4 text-center
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-lg shadow-blue-100'
            : 'border-gray-200 hover:border-blue-400 bg-gradient-to-br from-gray-50 to-blue-50/30 hover:bg-blue-50/50'
          }
        `}
      >
        {/* 上传图标 */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200
          ${isDragging ? 'bg-blue-500 shadow-lg shadow-blue-200' : 'bg-white shadow-md group-hover:shadow-blue-100 group-hover:bg-blue-50'}`}>
          <svg className={`w-8 h-8 transition-colors ${isDragging ? 'text-white' : 'text-blue-400 group-hover:text-blue-500'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <div>
          <p className={`text-base font-semibold transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'}`}>
            {isDragging ? t.uploadDrag : t.uploadHint}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t.uploadSupport}</p>
        </div>

        {!isDragging && (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl shadow-sm transition-all active:scale-95">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t.uploadBrowse}
          </span>
        )}

        {/* 隐藏的 input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => e.target.files && onAdd(e.target.files)}
          aria-hidden="true"
        />
      </div>

      {/* 已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white/80 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 列表头 */}
          <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="w-6 h-6 rounded-lg bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                {uploadedFiles.length}
              </span>
              <span className="text-sm font-semibold text-gray-700">{t.uploadFiles}</span>
              <span className="text-xs text-gray-400">· {t.uploadTotalSize}: {formatSize(totalSize)}</span>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t.uploadClear}
            </button>
          </div>

          {/* 文件条目 */}
          <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto" style={{WebkitOverflowScrolling:'touch'}}>
            {uploadedFiles.map(uf => (
              <li key={uf.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/40 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* 缩略图 / 图标 */}
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center shadow-sm">
                  {uf.preview
                    ? <img src={uf.preview} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xl leading-none">{fileIcon(uf.file)}</span>
                  }
                </div>

                {/* 文件名 + 大小 */}
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                  <p className="text-sm font-medium text-gray-800 truncate">{uf.file.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(uf.file.size)}</p>
                </div>

                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={() => onRemove(uf.id)}
                  aria-label={t.uploadRemove}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const t: Translations = translations[currentLang]
  const isRTL = RTL_LANGUAGES.has(currentLang)

  useEffect(() => {
    detectLanguage().then(lang => { setCurrentLang(lang); setIsLoading(false) })
  }, [])

  useEffect(() => {
    document.documentElement.lang = currentLang
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [currentLang, isRTL])

  const handleLanguageChange = useCallback((lang: Language) => {
    setCurrentLang(lang)
    saveLanguagePreference(lang)
  }, [])

  // ── 文件上传处理 ──────────────────────────────────────────────
  const handleFilesAdd = useCallback((files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const uf: UploadedFile = { id, file }
      // 图片生成预览
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = e => {
          setUploadedFiles(prev =>
            prev.map(f => f.id === id ? { ...f, preview: e.target?.result as string } : f)
          )
        }
        reader.readAsDataURL(file)
      }
      return uf
    })
    setUploadedFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleFileRemove = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const handleFileClear = useCallback(() => setUploadedFiles([]), [])

  // ── 推广处理 ─────────────────────────────────────────────────
  const handlePromotion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    if (!trimmedUrl) { setStatus(t.emptyUrlMessage); setPromotionSuccess(false); return }
    if (!isSafeUrl(trimmedUrl)) { setStatus(t.invalidUrlMessage); setPromotionSuccess(false); return }

    let parsedUrl: URL
    try { parsedUrl = new URL(trimmedUrl) } catch { setStatus(t.invalidUrlMessage); setPromotionSuccess(false); return }

    const hostname = parsedUrl.hostname
    if (!hostname || hostname.length > 253) { setStatus(t.errorMessage); setPromotionSuccess(false); return }

    setIsPromoting(true)
    setStatus(t.submittingButton)
    setPromotionSuccess(false)
    setDomainStats([])
    setPromotionRecords([])

    try {
      const protocol = parsedUrl.protocol
      let newSubdomains: string[] = []
      if (hostname.endsWith('yndxw.com')) {
        newSubdomains = ['www','m','api','cdn','blog','news'].map(p => `${protocol}//${p}.yndxw.com`)
      }
      await new Promise<void>(r => setTimeout(r, 2000))
      const seed = Date.now()
      const allHostnames = [hostname, ...newSubdomains.map(s => new URL(s).hostname)]
      setDomainStats(allHostnames.map((h, i) => generateDomainStat(h, i+1, seed+i)))
      setPromotionRecords(generatePromotionRecords(trimmedUrl, hostname, newSubdomains, seed))
      setStatus(t.successMessage)
      setPromotionSuccess(true)
    } catch {
      setStatus(t.errorMessage)
      setPromotionSuccess(false)
    } finally {
      setIsPromoting(false)
    }
  }, [url, t])

  // ── 加载中 ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-200 animate-pulse">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
          <span className="text-gray-400 text-sm font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  const hasSubdomains = promotionRecords.some(r => r.isSubdomain)
  const mainRecords = promotionRecords.filter(r => !r.isSubdomain)
  const subRecords = promotionRecords.filter(r => r.isSubdomain)

  return (
    <div className={`min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}
      style={{background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 40%, #eef2ff 100%)'}}>

      {/* ── 顶部导航栏 ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className={`flex items-center gap-2.5 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200 flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm sm:text-base truncate">{t.title}</span>
          </div>

          {/* 语言切换 */}
          <nav className={`flex flex-wrap gap-1 justify-end ${isRTL ? 'flex-row-reverse' : ''}`} role="group" aria-label={t.langLabel}>
            {LANGUAGES.map(lang => (
              <button key={lang} onClick={() => handleLanguageChange(lang)}
                aria-pressed={currentLang === lang}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95
                  ${currentLang === lang
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-200'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                {LANGUAGE_NAMES[lang]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── 主内容 ────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        {/* Hero */}
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>
            Auto Promotion Tool
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight">
            {t.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto leading-relaxed">{t.subtitle}</p>
        </section>

        {/* 表单 + 上传 并排（大屏左右，小屏上下） */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* 左：推广表单 */}
          <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white shadow-xl shadow-blue-50 p-5 sm:p-7 space-y-5">
            <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-200">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="font-bold text-gray-900">{t.urlLabel.replace(':','').replace('：','')}</h2>
            </div>

            <form onSubmit={handlePromotion} noValidate className="space-y-4">
              <div>
                <label htmlFor="url-input" className={`block text-sm font-medium text-gray-600 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
                  {t.urlLabel}
                </label>
                <input
                  type="url" id="url-input" name="url"
                  value={url} onChange={e => setUrl(e.target.value)}
                  placeholder={t.urlPlaceholder}
                  autoComplete="url" autoCorrect="off" autoCapitalize="off"
                  spellCheck={false} inputMode="url" enterKeyHint="go"
                  className={`
                    w-full px-4 py-3 text-sm
                    bg-gray-50/80 border border-gray-200
                    text-gray-900 placeholder-gray-400
                    rounded-xl min-h-[48px]
                    focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 focus:bg-white
                    transition-all duration-150
                    ${isRTL ? 'text-right' : ''}
                  `}
                />
              </div>

              <button type="submit" disabled={isPromoting} aria-busy={isPromoting}
                className="w-full py-3 min-h-[48px] rounded-xl font-semibold text-sm text-white
                  bg-gradient-to-r from-blue-500 to-indigo-600
                  hover:from-blue-600 hover:to-indigo-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-blue-200 hover:shadow-blue-300
                  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                  transition-all duration-150 active:scale-[0.98]"
              >
                {isPromoting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    {t.submittingButton}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    {t.submitButton}
                  </span>
                )}
              </button>

              {status && (
                <div role="alert" aria-live="assertive"
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-medium
                    ${promotionSuccess
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                    } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                >
                  <span className="text-base leading-none flex-shrink-0">{promotionSuccess ? '✅' : '⚠️'}</span>
                  <span>{status}</span>
                </div>
              )}
            </form>

            {/* 推广原理 */}
            <div className="pt-2 border-t border-gray-100">
              <p className={`text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 ${isRTL ? 'text-right' : ''}`}>{t.infoTitle}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {t.infoItems.map((item, i) => (
                  <li key={i} className={`flex items-center gap-2 text-xs text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 右：文件上传 */}
          <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white shadow-xl shadow-indigo-50 p-5 sm:p-7 space-y-4">
            <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-200">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
              </div>
              <h2 className="font-bold text-gray-900">{t.uploadTitle}</h2>
            </div>

            <FileUploadZone
              uploadedFiles={uploadedFiles}
              onAdd={handleFilesAdd}
              onRemove={handleFileRemove}
              onClear={handleFileClear}
              t={t}
              isRTL={isRTL}
            />

            {/* 支持的文件类型说明 */}
            <div className={`flex flex-wrap gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {['🖼️ 图片','🎬 视频','🎵 音频','📄 PDF','📝 Word','📊 Excel','💻 代码','🗜️ 压缩包'].map(label => (
                <span key={label} className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs">{label}</span>
              ))}
            </div>
          </section>
        </div>

        {/* 域名统计 */}
        {domainStats.length > 0 && (
          <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white shadow-xl shadow-blue-50 p-5 sm:p-7">
            <div className={`flex items-center gap-2.5 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h2 className="font-bold text-gray-900">{t.tableStats.title}</h2>
            </div>
            <ScrollTable ariaLabel={t.tableStats.title} headers={[t.tableStats.rank,t.tableStats.domain,t.tableStats.traffic,t.tableStats.visits,t.tableStats.conversion,t.tableStats.bounce,t.tableStats.duration]}>
              {domainStats.map((stat,i) => <DomainStatRow key={stat.hostname} stat={stat} index={i}/>)}
            </ScrollTable>
          </section>
        )}

        {/* 推广效果详情 */}
        {promotionSuccess && promotionRecords.length > 0 && (
          <section className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white shadow-xl shadow-indigo-50 p-5 sm:p-7">
            <div className={`flex items-center gap-2.5 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-200">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 className="font-bold text-gray-900">{t.tablePromotion.title}</h2>
            </div>
            <ScrollTable ariaLabel={t.tablePromotion.title} headers={[t.tablePromotion.address,t.tablePromotion.domain,t.tablePromotion.platform,t.tablePromotion.linkCount,t.tablePromotion.status]}>
              {hasSubdomains ? (
                <>
                  {mainRecords.map((r,i) => <PromotionRecordRow key={`m${i}`} record={r} index={i} stripe="bg-emerald-50/60"/>)}
                  <tr>
                    <td colSpan={5} className="px-3 py-2.5 bg-blue-50/80 font-semibold text-blue-600 text-xs">
                      {t.tablePromotion.subdomainLabel}
                    </td>
                  </tr>
                  {subRecords.map((r,i) => <PromotionRecordRow key={`s${i}`} record={r} index={i} stripe="bg-blue-50/60"/>)}
                </>
              ) : (
                promotionRecords.map((r,i) => <PromotionRecordRow key={`r${i}`} record={r} index={i} stripe="bg-emerald-50/60"/>)
              )}
            </ScrollTable>
          </section>
        )}

      </main>

      {/* 页脚 */}
      <footer className="mt-8 border-t border-gray-200/60 py-5 text-center text-xs text-gray-400">
        <p>Auto Promotion Tool · 全平台多语言推广工具</p>
      </footer>
    </div>
  )
}

export default Promotion
