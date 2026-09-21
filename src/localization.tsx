import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// The one list of languages. A new language is an entry here plus a
// dictionary below, the same way a new feed is one entry in TABS. Nothing
// else in the app holds a list of language codes.
//
// `endonym` is the language named in its own language, never translated: a
// reader who cannot read English still has to be able to find their own row
// in the menu, so "Español" stays "Español" in every dictionary.
// `htmlLang` is the BCP-47 tag for <html lang>, which screen readers read to
// pick a voice. `speechLang` is the tag handed to the browser's own speech
// synthesis when the natural voice is unavailable.
export const LANGUAGES = [
  { code: "en", endonym: "English", htmlLang: "en", speechLang: "en-US" },
  { code: "es", endonym: "Español", htmlLang: "es", speechLang: "es-ES" },
  { code: "zh", endonym: "中文（简体）", htmlLang: "zh-Hans", speechLang: "zh-CN" },
  { code: "hi", endonym: "हिन्दी", htmlLang: "hi", speechLang: "hi-IN" },
  { code: "fil", endonym: "Filipino", htmlLang: "fil", speechLang: "fil-PH" },
  { code: "vi", endonym: "Tiếng Việt", htmlLang: "vi", speechLang: "vi-VN" },
  { code: "ru", endonym: "Русский", htmlLang: "ru", speechLang: "ru-RU" },
  { code: "ja", endonym: "日本語", htmlLang: "ja", speechLang: "ja-JP" },
  { code: "ko", endonym: "한국어", htmlLang: "ko", speechLang: "ko-KR" },
  { code: "pt", endonym: "Português", htmlLang: "pt-BR", speechLang: "pt-BR" },
  { code: "fr", endonym: "Français", htmlLang: "fr", speechLang: "fr-FR" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];
type Key = keyof typeof EN;

export function languageInfo(code: Language) {
  return LANGUAGES.find((entry) => entry.code === code) ?? LANGUAGES[0];
}

const EN = {
  language: "Language",
  read: "Read",
  askAi: "Ask AI",
  about: "About",
  accessibility: "Accessibility",
  displayPreferences: "Choose display preferences",
  largerText: "Larger text",
  higherContrast: "Higher contrast",
  reduceMotion: "Reduce motion",
  colorVision: "Color vision",
  standardColors: "Standard colors",
  redGreen: "Red-green support",
  blueYellow: "Blue-yellow support",
  noColor: "No color",
  colorHelp: "Labels and icons always carry the meaning too.",
  readCard: "Read this card aloud",
  readLesson: "Read this lesson aloud",
  readAnswer: "Read answer aloud",
  readStory: "Read this story aloud",
  stopReading: "Stop reading",
  preparingVoice: "Preparing natural voice…",
  voiceDisclosure: "AI-generated voice",
  aiTranslated: "AI translated",
  viewEnglish: "View original English",
  showTranslation: "Show translation",
  translating: "Translating…",
  translationError: "Translation is unavailable right now.",
  source: "Source",
  news: "AI Sec News",
  learn: "AI Sec Learn",
  jobs: "AI Sec Jobs",
  newsIntro: "Real reports of AI used to trick people, rewritten in plain language.",
  learnIntro: "Free guides for understanding and defending AI systems.",
  jobsIntro: "Open roles where AI and security meet.",
} as const;

const ES: Record<Key, string> = {
  language: "Idioma", read: "Leer", askAi: "Preguntar a la IA", about: "Acerca de",
  accessibility: "Accesibilidad", displayPreferences: "Elige tus preferencias de visualización",
  largerText: "Texto más grande", higherContrast: "Mayor contraste", reduceMotion: "Reducir movimiento",
  colorVision: "Visión del color", standardColors: "Colores estándar", redGreen: "Ayuda para rojo y verde",
  blueYellow: "Ayuda para azul y amarillo", noColor: "Sin color",
  colorHelp: "Las etiquetas y los iconos también comunican el significado.",
  readCard: "Escuchar esta tarjeta", readLesson: "Escuchar esta lección", readAnswer: "Escuchar respuesta",
  readStory: "Escuchar esta historia", stopReading: "Detener lectura", preparingVoice: "Preparando voz natural…",
  voiceDisclosure: "Voz generada por IA", aiTranslated: "Traducido por IA", viewEnglish: "Ver inglés original",
  showTranslation: "Mostrar traducción", translating: "Traduciendo…",
  translationError: "La traducción no está disponible ahora.", source: "Fuente",
  news: "Noticias de seguridad de IA", learn: "Aprender seguridad de IA", jobs: "Empleos de seguridad de IA",
  newsIntro: "Informes reales sobre el uso de IA para engañar, explicados con palabras sencillas.",
  learnIntro: "Guías gratuitas para comprender y defender sistemas de IA.",
  jobsIntro: "Puestos abiertos donde se unen la IA y la seguridad.",
};

const ZH: Record<Key, string> = {
  language: "语言", read: "阅读", askAi: "询问 AI", about: "关于",
  accessibility: "无障碍", displayPreferences: "选择显示偏好",
  largerText: "更大的文字", higherContrast: "更高对比度", reduceMotion: "减少动效",
  colorVision: "色觉", standardColors: "标准颜色", redGreen: "红绿色辨识支持",
  blueYellow: "蓝黄色辨识支持", noColor: "不使用颜色",
  colorHelp: "标签和图标也始终传达同样的含义。",
  readCard: "朗读这张卡片", readLesson: "朗读这节课", readAnswer: "朗读答案",
  readStory: "朗读这篇报道", stopReading: "停止朗读", preparingVoice: "正在准备自然语音…",
  voiceDisclosure: "AI 生成的语音", aiTranslated: "AI 翻译", viewEnglish: "查看英文原文",
  showTranslation: "显示翻译", translating: "正在翻译…",
  translationError: "目前无法提供翻译。", source: "来源",
  news: "AI 安全新闻", learn: "学习 AI 安全", jobs: "AI 安全职位",
  newsIntro: "有人利用 AI 行骗的真实报道，用简单的话重新讲述。",
  learnIntro: "免费指南，帮助你理解和防护 AI 系统。",
  jobsIntro: "AI 与安全交汇的空缺职位。",
};

const HI: Record<Key, string> = {
  language: "भाषा", read: "पढ़ें", askAi: "AI से पूछें", about: "परिचय",
  accessibility: "सुगम्यता", displayPreferences: "प्रदर्शन की पसंद चुनें",
  largerText: "बड़ा टेक्स्ट", higherContrast: "अधिक कंट्रास्ट", reduceMotion: "गति कम करें",
  colorVision: "रंग दृष्टि", standardColors: "सामान्य रंग", redGreen: "लाल-हरे के लिए सहायता",
  blueYellow: "नीले-पीले के लिए सहायता", noColor: "बिना रंग",
  colorHelp: "लेबल और आइकन भी हमेशा अर्थ बताते हैं।",
  readCard: "यह कार्ड सुनें", readLesson: "यह पाठ सुनें", readAnswer: "उत्तर सुनें",
  readStory: "यह खबर सुनें", stopReading: "पढ़ना बंद करें", preparingVoice: "स्वाभाविक आवाज़ तैयार हो रही है…",
  voiceDisclosure: "AI से बनाई गई आवाज़", aiTranslated: "AI ने अनुवाद किया", viewEnglish: "मूल अंग्रेज़ी देखें",
  showTranslation: "अनुवाद दिखाएं", translating: "अनुवाद हो रहा है…",
  translationError: "अनुवाद अभी उपलब्ध नहीं है।", source: "स्रोत",
  news: "AI सुरक्षा समाचार", learn: "AI सुरक्षा सीखें", jobs: "AI सुरक्षा नौकरियां",
  newsIntro: "AI से लोगों को ठगने की सच्ची खबरें, आसान शब्दों में।",
  learnIntro: "AI सिस्टम को समझने और बचाने के लिए मुफ़्त गाइड।",
  jobsIntro: "ऐसी नौकरियां जहां AI और सुरक्षा मिलते हैं।",
};

const FIL: Record<Key, string> = {
  language: "Wika", read: "Basahin", askAi: "Magtanong sa AI", about: "Tungkol",
  accessibility: "Accessibility", displayPreferences: "Pumili ng mga setting sa display",
  largerText: "Mas malaking teksto", higherContrast: "Mas mataas na contrast", reduceMotion: "Bawasan ang galaw",
  colorVision: "Paningin sa kulay", standardColors: "Karaniwang mga kulay", redGreen: "Tulong sa pula at berde",
  blueYellow: "Tulong sa asul at dilaw", noColor: "Walang kulay",
  colorHelp: "May label at icon din para malinaw ang kahulugan.",
  readCard: "Pakinggan ang card", readLesson: "Pakinggan ang aralin", readAnswer: "Pakinggan ang sagot",
  readStory: "Pakinggan ang kuwento", stopReading: "Itigil ang pagbasa", preparingVoice: "Inihahanda ang natural na boses…",
  voiceDisclosure: "Boses na ginawa ng AI", aiTranslated: "Isinalin ng AI", viewEnglish: "Tingnan ang orihinal na English",
  showTranslation: "Ipakita ang salin", translating: "Isinasalin…",
  translationError: "Hindi available ngayon ang salin.", source: "Pinagmulan",
  news: "Balita sa AI Security", learn: "Matuto ng AI Security", jobs: "Mga Trabaho sa AI Security",
  newsIntro: "Mga totoong ulat tungkol sa panlilinlang gamit ang AI, ipinaliwanag sa simpleng salita.",
  learnIntro: "Libreng gabay sa pag-unawa at pagprotekta sa mga AI system.",
  jobsIntro: "Mga bukas na trabaho na pinagsasama ang AI at seguridad.",
};

const VI: Record<Key, string> = {
  language: "Ngôn ngữ", read: "Đọc", askAi: "Hỏi AI", about: "Giới thiệu",
  accessibility: "Trợ năng", displayPreferences: "Chọn tùy chọn hiển thị",
  largerText: "Chữ lớn hơn", higherContrast: "Tương phản cao hơn", reduceMotion: "Giảm chuyển động",
  colorVision: "Thị giác màu", standardColors: "Màu tiêu chuẩn", redGreen: "Hỗ trợ đỏ và xanh lá",
  blueYellow: "Hỗ trợ xanh dương và vàng", noColor: "Không dùng màu",
  colorHelp: "Nhãn và biểu tượng luôn truyền tải cùng ý nghĩa.",
  readCard: "Nghe thẻ này", readLesson: "Nghe bài học này", readAnswer: "Nghe câu trả lời",
  readStory: "Nghe bài này", stopReading: "Dừng đọc", preparingVoice: "Đang chuẩn bị giọng tự nhiên…",
  voiceDisclosure: "Giọng nói do AI tạo", aiTranslated: "Dịch bằng AI", viewEnglish: "Xem bản tiếng Anh gốc",
  showTranslation: "Hiện bản dịch", translating: "Đang dịch…",
  translationError: "Hiện chưa có bản dịch.", source: "Nguồn",
  news: "Tin an ninh AI", learn: "Học an ninh AI", jobs: "Việc làm an ninh AI",
  newsIntro: "Những vụ thật về việc dùng AI để lừa người, kể lại bằng lời đơn giản.",
  learnIntro: "Hướng dẫn miễn phí để hiểu và bảo vệ hệ thống AI.",
  jobsIntro: "Những vị trí đang tuyển nơi AI và an ninh gặp nhau.",
};

const RU: Record<Key, string> = {
  language: "Язык", read: "Читать", askAi: "Спросить ИИ", about: "О проекте",
  accessibility: "Доступность", displayPreferences: "Выберите настройки отображения",
  largerText: "Крупный текст", higherContrast: "Выше контраст", reduceMotion: "Меньше анимации",
  colorVision: "Цветовое зрение", standardColors: "Обычные цвета", redGreen: "Поддержка красного и зелёного",
  blueYellow: "Поддержка синего и жёлтого", noColor: "Без цвета",
  colorHelp: "Подписи и значки тоже всегда передают смысл.",
  readCard: "Прослушать карточку", readLesson: "Прослушать урок", readAnswer: "Прослушать ответ",
  readStory: "Прослушать материал", stopReading: "Остановить чтение", preparingVoice: "Готовим естественный голос…",
  voiceDisclosure: "Голос создан ИИ", aiTranslated: "Перевод сделан ИИ", viewEnglish: "Показать оригинал на английском",
  showTranslation: "Показать перевод", translating: "Переводим…",
  translationError: "Перевод сейчас недоступен.", source: "Источник",
  news: "Новости безопасности ИИ", learn: "Учить безопасность ИИ", jobs: "Работа в безопасности ИИ",
  newsIntro: "Настоящие случаи, когда ИИ использовали для обмана, простыми словами.",
  learnIntro: "Бесплатные руководства, как понимать и защищать системы ИИ.",
  jobsIntro: "Открытые вакансии на стыке ИИ и безопасности.",
};

const JA: Record<Key, string> = {
  language: "言語", read: "読む", askAi: "AIに聞く", about: "このサイトについて",
  accessibility: "アクセシビリティ", displayPreferences: "表示の設定を選ぶ",
  largerText: "文字を大きく", higherContrast: "コントラストを高く", reduceMotion: "動きを減らす",
  colorVision: "色覚", standardColors: "標準の色", redGreen: "赤と緑のサポート",
  blueYellow: "青と黄のサポート", noColor: "色を使わない",
  colorHelp: "ラベルとアイコンでも同じ意味が伝わります。",
  readCard: "このカードを読み上げる", readLesson: "このレッスンを読み上げる", readAnswer: "答えを読み上げる",
  readStory: "この記事を読み上げる", stopReading: "読み上げを止める", preparingVoice: "自然な音声を準備中…",
  voiceDisclosure: "AIが生成した音声", aiTranslated: "AIによる翻訳", viewEnglish: "英語の原文を見る",
  showTranslation: "翻訳を表示", translating: "翻訳中…",
  translationError: "今は翻訳を利用できません。", source: "出典",
  news: "AIセキュリティニュース", learn: "AIセキュリティを学ぶ", jobs: "AIセキュリティの求人",
  newsIntro: "AIを使って人をだました実際の事例を、やさしい言葉で伝えます。",
  learnIntro: "AIの仕組みを理解し、守るための無料ガイド。",
  jobsIntro: "AIとセキュリティが重なる求人。",
};

const KO: Record<Key, string> = {
  language: "언어", read: "읽기", askAi: "AI에게 묻기", about: "소개",
  accessibility: "접근성", displayPreferences: "화면 설정 선택",
  largerText: "더 큰 글자", higherContrast: "더 높은 대비", reduceMotion: "움직임 줄이기",
  colorVision: "색각", standardColors: "기본 색상", redGreen: "빨강-초록 지원",
  blueYellow: "파랑-노랑 지원", noColor: "색 사용 안 함",
  colorHelp: "라벨과 아이콘도 항상 같은 의미를 전달합니다.",
  readCard: "이 카드 읽어주기", readLesson: "이 수업 읽어주기", readAnswer: "답 읽어주기",
  readStory: "이 기사 읽어주기", stopReading: "읽기 멈추기", preparingVoice: "자연스러운 음성 준비 중…",
  voiceDisclosure: "AI가 만든 음성", aiTranslated: "AI 번역", viewEnglish: "영어 원문 보기",
  showTranslation: "번역 보기", translating: "번역 중…",
  translationError: "지금은 번역을 이용할 수 없습니다.", source: "출처",
  news: "AI 보안 뉴스", learn: "AI 보안 배우기", jobs: "AI 보안 채용",
  newsIntro: "AI로 사람을 속인 실제 사례를 쉬운 말로 전합니다.",
  learnIntro: "AI 시스템을 이해하고 지키는 무료 안내서.",
  jobsIntro: "AI와 보안이 만나는 채용 공고.",
};

const PT: Record<Key, string> = {
  language: "Idioma", read: "Ler", askAi: "Perguntar à IA", about: "Sobre",
  accessibility: "Acessibilidade", displayPreferences: "Escolha as preferências de exibição",
  largerText: "Texto maior", higherContrast: "Mais contraste", reduceMotion: "Reduzir movimento",
  colorVision: "Visão de cores", standardColors: "Cores padrão", redGreen: "Apoio para vermelho e verde",
  blueYellow: "Apoio para azul e amarelo", noColor: "Sem cor",
  colorHelp: "Os rótulos e os ícones também indicam o significado.",
  readCard: "Ouvir este cartão", readLesson: "Ouvir esta lição", readAnswer: "Ouvir a resposta",
  readStory: "Ouvir esta matéria", stopReading: "Parar a leitura", preparingVoice: "Preparando voz natural…",
  voiceDisclosure: "Voz gerada por IA", aiTranslated: "Traduzido por IA", viewEnglish: "Ver o inglês original",
  showTranslation: "Mostrar tradução", translating: "Traduzindo…",
  translationError: "A tradução não está disponível agora.", source: "Fonte",
  news: "Notícias de segurança em IA", learn: "Aprender segurança em IA", jobs: "Vagas em segurança de IA",
  newsIntro: "Casos reais de IA usada para enganar pessoas, contados em palavras simples.",
  learnIntro: "Guias gratuitos para entender e proteger sistemas de IA.",
  jobsIntro: "Vagas abertas onde IA e segurança se encontram.",
};

const FR: Record<Key, string> = {
  language: "Langue", read: "Lire", askAi: "Demander à l'IA", about: "À propos",
  accessibility: "Accessibilité", displayPreferences: "Choisissez vos préférences d'affichage",
  largerText: "Texte plus grand", higherContrast: "Plus de contraste", reduceMotion: "Réduire les animations",
  colorVision: "Vision des couleurs", standardColors: "Couleurs standard", redGreen: "Aide pour le rouge et le vert",
  blueYellow: "Aide pour le bleu et le jaune", noColor: "Sans couleur",
  colorHelp: "Les libellés et les icônes portent aussi le sens.",
  readCard: "Écouter cette fiche", readLesson: "Écouter cette leçon", readAnswer: "Écouter la réponse",
  readStory: "Écouter cet article", stopReading: "Arrêter la lecture", preparingVoice: "Préparation de la voix naturelle…",
  voiceDisclosure: "Voix générée par IA", aiTranslated: "Traduit par IA", viewEnglish: "Voir l'anglais d'origine",
  showTranslation: "Afficher la traduction", translating: "Traduction en cours…",
  translationError: "La traduction n'est pas disponible pour le moment.", source: "Source",
  news: "Actus sécurité de l'IA", learn: "Apprendre la sécurité de l'IA", jobs: "Emplois en sécurité de l'IA",
  newsIntro: "Des cas réels d'IA utilisée pour tromper les gens, en mots simples.",
  learnIntro: "Des guides gratuits pour comprendre et protéger les systèmes d'IA.",
  jobsIntro: "Des postes ouverts où l'IA et la sécurité se rejoignent.",
};

const DICTIONARIES: Record<Language, Record<Key, string>> = {
  en: EN, es: ES, zh: ZH, hi: HI, fil: FIL, vi: VI, ru: RU, ja: JA, ko: KO, pt: PT, fr: FR,
};

const LanguageContext = createContext<{ language: Language; setLanguage: (value: Language) => void; t: (key: Key) => string } | null>(null);

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((entry) => entry.code === value);
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem("flipsec-language");
    if (isLanguage(saved)) return saved;
  } catch { /* Use English when storage is unavailable. */ }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = languageInfo(language).htmlLang;
    try { localStorage.setItem("flipsec-language", language); } catch { /* Preference still applies. */ }
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, t: (key) => DICTIONARIES[language][key] }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="flex min-h-11 items-center gap-2 text-base font-semibold text-navy">
      <span className="sr-only">{t("language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={t("language")}
        className="min-h-11 rounded-control border border-line bg-white px-2 text-base text-navy"
      >
        {/* Each option is tagged with its own lang so a screen reader
            pronounces the endonym in that language rather than reading
            "中文" through an English voice. */}
        {LANGUAGES.map((entry) => (
          <option key={entry.code} value={entry.code} lang={entry.htmlLang}>
            {entry.endonym}
          </option>
        ))}
      </select>
    </label>
  );
}
