// ─── 支持语言类型 ─────────────────────────────────────────────
export type Language = 'zh' | 'en' | 'fr' | 'ja' | 'de' | 'ar';

// RTL 语言集合
export const RTL_LANGUAGES: Set<Language> = new Set(['ar']);

export interface Translations {
  title: string;
  subtitle: string;
  urlLabel: string;
  urlPlaceholder: string;
  submitButton: string;
  submittingButton: string;
  successMessage: string;
  errorMessage: string;
  emptyUrlMessage: string;
  invalidUrlMessage: string;
  infoTitle: string;
  infoItems: string[];
  // 表格标题
  tableStats: {
    title: string;
    rank: string;
    domain: string;
    traffic: string;
    visits: string;
    conversion: string;
    bounce: string;
    duration: string;
  };
  tablePromotion: {
    title: string;
    address: string;
    domain: string;
    platform: string;
    linkCount: string;
    status: string;
    statusSuccess: string;
    subdomainLabel: string;
  };
  loading: string;
  langLabel: string;
}

export const translations: Record<Language, Translations> = {
  zh: {
    title: '自动推广工具',
    subtitle: '输入网址，我们将帮助您推广到互联网上的所有用户访问。',
    urlLabel: '网址：',
    urlPlaceholder: '请输入完整的网址，例如：https://example.com',
    submitButton: '开始推广',
    submittingButton: '推广中...',
    successMessage: '推广成功！您的网址已被推送到互联网上。',
    errorMessage: '推广失败，请稍后重试。',
    emptyUrlMessage: '请输入网址',
    invalidUrlMessage: '网址格式不正确，请输入 http:// 或 https:// 开头的完整网址',
    infoTitle: '推广原理',
    infoItems: [
      '自动提交到各大搜索引擎',
      '分享到社交媒体平台',
      '生成推广链接',
      '监控推广效果',
    ],
    tableStats: {
      title: '推广域名详细数据',
      rank: '排名',
      domain: '域名',
      traffic: '流量',
      visits: '访问量',
      conversion: '转化率',
      bounce: '跳出率',
      duration: '平均停留时间',
    },
    tablePromotion: {
      title: '推广效果详情',
      address: '地址',
      domain: '域名',
      platform: '平台/引擎',
      linkCount: '链接次数',
      status: '状态',
      statusSuccess: '成功',
      subdomainLabel: 'yndxw.com 子域名推广结果',
    },
    loading: '加载中...',
    langLabel: '语言',
  },
  en: {
    title: 'Auto Promotion Tool',
    subtitle: 'Enter your URL and we will help you promote it to all users on the internet.',
    urlLabel: 'URL:',
    urlPlaceholder: 'Enter full URL, e.g.: https://example.com',
    submitButton: 'Start Promotion',
    submittingButton: 'Promoting...',
    successMessage: 'Promotion successful! Your URL has been pushed to the internet.',
    errorMessage: 'Promotion failed, please try again later.',
    emptyUrlMessage: 'Please enter a URL',
    invalidUrlMessage: 'Invalid URL. Please enter a full URL starting with http:// or https://',
    infoTitle: 'How It Works',
    infoItems: [
      'Auto-submit to major search engines',
      'Share to social media platforms',
      'Generate promotion links',
      'Monitor promotion effectiveness',
    ],
    tableStats: {
      title: 'Domain Statistics',
      rank: 'Rank',
      domain: 'Domain',
      traffic: 'Traffic',
      visits: 'Visits',
      conversion: 'Conversion',
      bounce: 'Bounce Rate',
      duration: 'Avg Duration',
    },
    tablePromotion: {
      title: 'Promotion Details',
      address: 'URL',
      domain: 'Domain',
      platform: 'Platform / Engine',
      linkCount: 'Links',
      status: 'Status',
      statusSuccess: 'Success',
      subdomainLabel: 'yndxw.com Subdomain Results',
    },
    loading: 'Loading...',
    langLabel: 'Language',
  },
  fr: {
    title: 'Outil de promotion automatique',
    subtitle: "Entrez votre URL et nous vous aiderons à la promouvoir à tous les utilisateurs sur Internet.",
    urlLabel: 'URL :',
    urlPlaceholder: "Entrez l'URL complète, par exemple : https://example.com",
    submitButton: 'Démarrer la promotion',
    submittingButton: 'Promotion en cours...',
    successMessage: 'Promotion réussie ! Votre URL a été mise en ligne sur Internet.',
    errorMessage: 'Échec de la promotion, veuillez réessayer plus tard.',
    emptyUrlMessage: 'Veuillez entrer une URL',
    invalidUrlMessage: "URL invalide. Veuillez entrer une URL complète commençant par http:// ou https://",
    infoTitle: 'Comment ça fonctionne',
    infoItems: [
      'Soumission automatique aux principaux moteurs de recherche',
      'Partage sur les plateformes de réseaux sociaux',
      'Génération de liens de promotion',
      "Surveillance de l'efficacité de la promotion",
    ],
    tableStats: {
      title: 'Statistiques des domaines',
      rank: 'Rang',
      domain: 'Domaine',
      traffic: 'Trafic',
      visits: 'Visites',
      conversion: 'Conversion',
      bounce: 'Taux de rebond',
      duration: 'Durée moy.',
    },
    tablePromotion: {
      title: 'Détails de la promotion',
      address: 'URL',
      domain: 'Domaine',
      platform: 'Plateforme / Moteur',
      linkCount: 'Liens',
      status: 'Statut',
      statusSuccess: 'Succès',
      subdomainLabel: 'Résultats des sous-domaines yndxw.com',
    },
    loading: 'Chargement...',
    langLabel: 'Langue',
  },
  de: {
    title: 'Automatisches Promotion-Tool',
    subtitle: 'Geben Sie Ihre URL ein und wir helfen Ihnen, sie allen Benutzern im Internet zu bewerben.',
    urlLabel: 'URL:',
    urlPlaceholder: 'Vollständige URL eingeben, z.B.: https://example.com',
    submitButton: 'Promotion starten',
    submittingButton: 'Wird beworben...',
    successMessage: 'Promotion erfolgreich! Ihre URL wurde ins Internet veröffentlicht.',
    errorMessage: 'Promotion fehlgeschlagen, bitte versuchen Sie es später erneut.',
    emptyUrlMessage: 'Bitte geben Sie eine URL ein',
    invalidUrlMessage: 'Ungültige URL. Bitte geben Sie eine vollständige URL beginnend mit http:// oder https:// ein',
    infoTitle: 'Wie es funktioniert',
    infoItems: [
      'Automatische Einreichung bei großen Suchmaschinen',
      'Auf Social-Media-Plattformen teilen',
      'Werbelinks generieren',
      'Werbeeffektivität überwachen',
    ],
    tableStats: {
      title: 'Domain-Statistiken',
      rank: 'Rang',
      domain: 'Domain',
      traffic: 'Traffic',
      visits: 'Besuche',
      conversion: 'Konversion',
      bounce: 'Absprungrate',
      duration: 'Ø Verweildauer',
    },
    tablePromotion: {
      title: 'Promotionsdetails',
      address: 'URL',
      domain: 'Domain',
      platform: 'Plattform / Suchmaschine',
      linkCount: 'Links',
      status: 'Status',
      statusSuccess: 'Erfolg',
      subdomainLabel: 'yndxw.com Subdomain-Ergebnisse',
    },
    loading: 'Laden...',
    langLabel: 'Sprache',
  },
  ja: {
    title: '自動プロモーションツール',
    subtitle: 'URLを入力すると、インターネット上のすべてのユーザーにプロモーションします。',
    urlLabel: 'URL：',
    urlPlaceholder: '完全なURLを入力してください。例：https://example.com',
    submitButton: 'プロモーション開始',
    submittingButton: 'プロモーション中...',
    successMessage: 'プロモーション成功！URLがインターネットに公開されました。',
    errorMessage: 'プロモーションに失敗しました。後でもう一度お試しください。',
    emptyUrlMessage: 'URLを入力してください',
    invalidUrlMessage: '無効なURLです。http:// または https:// で始まる完全なURLを入力してください',
    infoTitle: 'プロモーションの仕組み',
    infoItems: [
      '主要な検索エンジンに自動送信',
      'ソーシャルメディアプラットフォームで共有',
      'プロモーションリンクの生成',
      'プロモーション効果の監視',
    ],
    tableStats: {
      title: 'ドメイン統計',
      rank: '順位',
      domain: 'ドメイン',
      traffic: 'トラフィック',
      visits: '訪問数',
      conversion: 'コンバージョン',
      bounce: '直帰率',
      duration: '平均滞在時間',
    },
    tablePromotion: {
      title: 'プロモーション詳細',
      address: 'URL',
      domain: 'ドメイン',
      platform: 'プラットフォーム',
      linkCount: 'リンク数',
      status: 'ステータス',
      statusSuccess: '成功',
      subdomainLabel: 'yndxw.com サブドメイン結果',
    },
    loading: '読み込み中...',
    langLabel: '言語',
  },
  ar: {
    title: 'أداة الترويج التلقائي',
    subtitle: 'أدخل عنوان URL الخاص بك وسنساعدك في الترويج له لجميع المستخدمين على الإنترنت.',
    urlLabel: 'عنوان URL:',
    urlPlaceholder: 'أدخل عنوان URL الكامل، مثال: https://example.com',
    submitButton: 'بدء الترويج',
    submittingButton: 'جاري الترويج...',
    successMessage: 'تم الترويج بنجاح! تم نشر عنوان URL الخاص بك على الإنترنت.',
    errorMessage: 'فشل الترويج، يرجى المحاولة مرة أخرى لاحقًا.',
    emptyUrlMessage: 'يرجى إدخال عنوان URL',
    invalidUrlMessage: 'عنوان URL غير صالح. يرجى إدخال عنوان URL كامل يبدأ بـ http:// أو https://',
    infoTitle: 'كيفية العمل',
    infoItems: [
      'الإرسال التلقائي إلى محركات البحث الرئيسية',
      'المشاركة على منصات التواصل الاجتماعي',
      'إنشاء روابط ترويجية',
      'مراقبة فعالية الترويج',
    ],
    tableStats: {
      title: 'إحصائيات النطاق',
      rank: 'الترتيب',
      domain: 'النطاق',
      traffic: 'الزيارات',
      visits: 'عدد الزيارات',
      conversion: 'معدل التحويل',
      bounce: 'معدل الارتداد',
      duration: 'متوسط المدة',
    },
    tablePromotion: {
      title: 'تفاصيل الترويج',
      address: 'عنوان URL',
      domain: 'النطاق',
      platform: 'المنصة / المحرك',
      linkCount: 'الروابط',
      status: 'الحالة',
      statusSuccess: 'نجاح',
      subdomainLabel: 'نتائج النطاقات الفرعية yndxw.com',
    },
    loading: 'جارٍ التحميل...',
    langLabel: 'اللغة',
  },
};

/** 国家代码 → 语言映射（未列出的国家默认返回英语） */
export const countryToLanguage: Record<string, Language> = {
  // 中文地区
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh',
  // 日语
  JP: 'ja',
  // 德语
  DE: 'de', AT: 'de', CH: 'de',
  // 法语
  FR: 'fr', BE: 'fr', LU: 'fr', CI: 'fr', SN: 'fr',
  // 阿拉伯语
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar',
  KW: 'ar', LB: 'ar', LY: 'ar', MA: 'ar', OM: 'ar',
  QA: 'ar', SY: 'ar', TN: 'ar', YE: 'ar', BH: 'ar',
  DZ: 'ar', SD: 'ar', PS: 'ar',
  // 英语
  US: 'en', GB: 'en', CA: 'en', AU: 'en',
  NZ: 'en', IE: 'en', ZA: 'en', IN: 'en',
};

export const getLanguageByCountry = (countryCode: string): Language => {
  return countryToLanguage[countryCode.toUpperCase()] ?? 'en';
};

/**
 * 检测用户语言（优先浏览器语言，其次 URL 参数 ?lang=，无需外部 API）
 */
export const detectLanguage = async (): Promise<Language> => {
  try {
    // 1. 优先读取 URL 参数 ?lang=
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang && ['zh', 'en', 'fr', 'ja', 'de', 'ar'].includes(urlLang)) {
      return urlLang as Language;
    }

    // 2. 读取 localStorage 缓存的用户偏好
    const savedLang = localStorage.getItem('preferred_lang');
    if (savedLang && ['zh', 'en', 'fr', 'ja', 'de', 'ar'].includes(savedLang)) {
      return savedLang as Language;
    }

    // 3. 浏览器语言
    const langs = navigator.languages ?? [navigator.language];
    for (const lang of langs) {
      const code = lang.split('-')[0].toLowerCase();
      if (['zh', 'en', 'fr', 'ja', 'de', 'ar'].includes(code)) {
        return code as Language;
      }
    }
    return 'en';
  } catch {
    return 'en';
  }
};

/** 保存用户语言偏好到 localStorage */
export const saveLanguagePreference = (lang: Language): void => {
  try {
    localStorage.setItem('preferred_lang', lang);
  } catch {
    // localStorage 不可用时静默失败
  }
};
