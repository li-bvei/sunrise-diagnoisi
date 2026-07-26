export type Locale = 'zh-CN' | 'ja-JP'

export type LocalizedText = Record<Locale, string>

export type ToolCategory = 'residence' | 'property' | 'business' | 'life'
export type ToolStatus = 'available' | 'upcoming'

export interface DiagnosisTool {
  id: string
  category: ToolCategory
  icon: string
  name: LocalizedText
  description: LocalizedText
  duration: LocalizedText
  results: LocalizedText
  status: ToolStatus
  route?: string
}

export interface CategoryInfo {
  id: ToolCategory
  icon: string
  name: LocalizedText
  description: LocalizedText
  count: number
}
