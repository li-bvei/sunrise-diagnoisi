import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Locale, LocalizedText } from '@/types/content'
import { messages } from '@/data/messages'

const STORAGE_KEY = 'sunrise-diagnosis-locale'

function initialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'ja-JP' || saved === 'zh-CN') return saved
  return import.meta.env.VITE_DEFAULT_LOCALE === 'ja-JP' ? 'ja-JP' : 'zh-CN'
}

export const useSettingsStore = defineStore('settings', () => {
  const locale = ref<Locale>(initialLocale())
  const dictionary = computed(() => messages[locale.value])

  function setLocale(next: Locale) {
    locale.value = next
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
  }

  function toggleLocale() {
    setLocale(locale.value === 'zh-CN' ? 'ja-JP' : 'zh-CN')
  }

  function text(value: LocalizedText) {
    return value[locale.value]
  }

  document.documentElement.lang = locale.value

  return { locale, dictionary, setLocale, toggleLocale, text }
})
