import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettingAfterPendingSaves } from '../services/setting'
import zhCN from './zh-CN'
import enUS from './en-US'
import * as runtime from '@wailsio/runtime'
import { EventSystemLanguage } from '../types/type'

export type Language = 'zh-CN' | 'en-US'
export type LanguagePreference = Language | 'auto'

const dictionaries = { 'zh-CN': zhCN, 'en-US': enUS }

function normalizeLanguage(value?: string): Language {
  if (value === 'zh-CN' || value === 'en-US') return value
  const systemLanguage = navigator.languages?.[0] || navigator.language
  return systemLanguage.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

type LanguageContextValue = {
  language: Language
  setLanguage: (preference: LanguagePreference) => void
  t: (key: string, values?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setActiveLanguage] = useState<Language>(() => normalizeLanguage())
  const setLanguage = useCallback((preference: LanguagePreference) => {
    setActiveLanguage(normalizeLanguage(preference))
  }, [])

  useEffect(() => {
    let active = true
    void getSettingAfterPendingSaves().then(setting => {
      if (active) setLanguage(setting.System.Language as LanguagePreference)
    }).catch(() => {
      // The settings page reports load errors; keep the default language here.
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    void runtime.Events.Emit(EventSystemLanguage, language)
  }, [language])

  const t = useCallback((key: string, values?: Record<string, string>) => {
    const dictionary = dictionaries[language] as Record<string, string>
    const message = dictionary[key] ?? key
    return message.replace(/\{(\w+)\}/g, (match, name: string) => values?.[name] ?? match)
  }, [language])

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('LanguageProvider is missing')
  return context
}
