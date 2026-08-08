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

export interface TakkenTopicTextBlock {
  type: 'text'
  text: string
}

export interface TakkenTopicListBlock {
  type: 'list'
  style: 'ordered' | 'unordered'
  items: string[]
}

export interface TakkenTopicTableBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
}

export interface TakkenTopicMnemonicBlock {
  type: 'mnemonic'
  text: string
}

export interface TakkenTopicTrapBlock {
  type: 'trap'
  text: string
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
  title: string
  source: string
  sections: TakkenTopicSection[]
}
