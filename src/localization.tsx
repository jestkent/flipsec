import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "es" | "fil";
type Key = keyof typeof EN;

const EN = {
  language: "Language",
  english: "English",
  spanish: "Español",
  filipino: "Filipino",
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
  language: "Idioma", english: "English", spanish: "Español", filipino: "Filipino",
  read: "Leer", askAi: "Preguntar a la IA", about: "Acerca de", accessibility: "Accesibilidad",
  displayPreferences: "Elige tus preferencias de visualización", largerText: "Texto más grande",
  higherContrast: "Mayor contraste", reduceMotion: "Reducir movimiento", colorVision: "Visión del color",
  standardColors: "Colores estándar", redGreen: "Ayuda para rojo y verde", blueYellow: "Ayuda para azul y amarillo",
  noColor: "Sin color", colorHelp: "Las etiquetas y los iconos también comunican el significado.",
  readCard: "Escuchar esta tarjeta", readLesson: "Escuchar esta lección", readAnswer: "Escuchar respuesta",
  readStory: "Escuchar esta historia", stopReading: "Detener lectura", preparingVoice: "Preparando voz natural…",
  voiceDisclosure: "Voz generada por IA", aiTranslated: "Traducido por IA", viewEnglish: "Ver inglés original",
  translating: "Traduciendo…", translationError: "La traducción no está disponible ahora.", source: "Fuente", showTranslation: "Mostrar traducción",
  news: "Noticias de seguridad de IA", learn: "Aprender seguridad de IA", jobs: "Empleos de seguridad de IA",
  newsIntro: "Informes reales sobre el uso de IA para engañar, explicados con palabras sencillas.",
  learnIntro: "Guías gratuitas para comprender y defender sistemas de IA.", jobsIntro: "Puestos abiertos donde se unen la IA y la seguridad.",
};

const FIL: Record<Key, string> = {
  language: "Wika", english: "English", spanish: "Español", filipino: "Filipino",
  read: "Basahin", askAi: "Magtanong sa AI", about: "Tungkol", accessibility: "Accessibility",
  displayPreferences: "Pumili ng mga setting sa display", largerText: "Mas malaking teksto",
  higherContrast: "Mas mataas na contrast", reduceMotion: "Bawasan ang galaw", colorVision: "Paningin sa kulay",
  standardColors: "Karaniwang mga kulay", redGreen: "Tulong sa pula at berde", blueYellow: "Tulong sa asul at dilaw",
  noColor: "Walang kulay", colorHelp: "May label at icon din para malinaw ang kahulugan.",
  readCard: "Pakinggan ang card", readLesson: "Pakinggan ang aralin", readAnswer: "Pakinggan ang sagot",
  readStory: "Pakinggan ang kuwento", stopReading: "Itigil ang pagbasa", preparingVoice: "Inihahanda ang natural na boses…",
  voiceDisclosure: "Boses na ginawa ng AI", aiTranslated: "Isinalin ng AI", viewEnglish: "Tingnan ang orihinal na English",
  translating: "Isinasalin…", translationError: "Hindi available ngayon ang salin.", source: "Pinagmulan", showTranslation: "Ipakita ang salin",
  news: "Balita sa AI Security", learn: "Matuto ng AI Security", jobs: "Mga Trabaho sa AI Security",
  newsIntro: "Mga totoong ulat tungkol sa panlilinlang gamit ang AI, ipinaliwanag sa simpleng salita.",
  learnIntro: "Libreng gabay sa pag-unawa at pagprotekta sa mga AI system.", jobsIntro: "Mga bukas na trabaho na pinagsasama ang AI at seguridad.",
};

const DICTIONARIES: Record<Language, Record<Key, string>> = { en: EN, es: ES, fil: FIL };
const LanguageContext = createContext<{ language: Language; setLanguage: (value: Language) => void; t: (key: Key) => string } | null>(null);

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem("flipsec-language");
    if (saved === "en" || saved === "es" || saved === "fil") return saved;
  } catch { /* Use English when storage is unavailable. */ }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language === "fil" ? "fil" : language;
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
      <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t("language")} className="min-h-11 rounded-control border border-line bg-white px-2 text-base text-navy">
        <option value="en">{t("english")}</option>
        <option value="es">{t("spanish")}</option>
        <option value="fil">{t("filipino")}</option>
      </select>
    </label>
  );
}
