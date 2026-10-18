import { createContext, useContext, useState } from 'react'
import { t } from '../i18n'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en')
  const toggle = () => setLang(l => l === 'en' ? 'fil' : 'en')
  return (
    <LangContext.Provider value={{ lang, toggle, tx: t[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
