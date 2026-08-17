export interface TakkenQuestion {
  id: string
  tag: string
  title: string
  stem: string
  options: string[]
  correct: number
  explain: string
  takeaway: string
}

export interface TakkenAttemptRecord {
  attempts: number
  correct: number
}

export type TakkenAttemptMap = Record<string, TakkenAttemptRecord>

export type TakkenPracticeMode = 'all' | 'wrong' | 'random'

export interface TakkenBilingualText {
  zh: string
  ja?: string
}

export interface TakkenTopicTextBlock {
  type: 'text'
  content: TakkenBilingualText
}

export interface TakkenTopicListBlock {
  type: 'list'
  style: 'ordered' | 'unordered'
  items: TakkenBilingualText[]
}

export interface TakkenTopicTableBlock {
  type: 'table'
  headers: TakkenBilingualText[]
  rows: TakkenBilingualText[][]
}

export interface TakkenTopicMnemonicBlock {
  type: 'mnemonic'
  content: TakkenBilingualText
}

export interface TakkenTopicTrapBlock {
  type: 'trap'
  content: TakkenBilingualText
}

export type TakkenTopicBlock =
  | TakkenTopicTextBlock
  | TakkenTopicListBlock
  | TakkenTopicTableBlock
  | TakkenTopicMnemonicBlock
  | TakkenTopicTrapBlock

export interface TakkenTopicSection {
  heading: string
  blocks: TakkenTopicBlock[]
}

export interface TakkenTopic {
  id: string
  tag: string
  title: TakkenBilingualText
  source: string
  sections: TakkenTopicSection[]
}
