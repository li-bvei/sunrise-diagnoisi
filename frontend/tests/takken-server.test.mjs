import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { validateBatch, validateQuestion, validateTopic } from '../../server/validate.mjs'

const question = (overrides = {}) => ({
  id: 'x-1', tag: '权利关系・民法', title: '平成27年 問3', stem: '問題', options: ['a', 'b', 'c', 'd'], correct: 1,
  explain: '解析', takeaway: '要点', ...overrides,
})
const topic = (overrides = {}) => ({
  id: 't-x', tag: '民法', title: { zh: '标题' }, source: '来源',
  sections: [{ heading: '节', blocks: [{ type: 'text', content: { zh: '正文' } }] }], ...overrides,
})

test('the exported JSON backups pass the same validation the API enforces on every write', () => {
  const questions = JSON.parse(readFileSync(resolve('src/data/takken-questions.json'), 'utf8'))
  const topics = JSON.parse(readFileSync(resolve('src/data/takken-topics.json'), 'utf8'))
  assert.doesNotThrow(() => validateBatch(questions, validateQuestion))
  assert.doesNotThrow(() => validateBatch(topics, validateTopic))
})

test('question validation rejects the shapes that would break the quiz', () => {
  assert.doesNotThrow(() => validateQuestion(question(), 0))
  assert.throws(() => validateQuestion(question({ id: '' }), 0), /missing "id"/)
  assert.throws(() => validateQuestion(question({ options: ['a', 'b'] }), 0), /exactly 4/)
  assert.throws(() => validateQuestion(question({ correct: 4 }), 0), /index 0-3/)
  assert.throws(() => validateQuestion(question({ stem: '  ' }), 0), /missing "stem"/)
  assert.throws(() => validateQuestion(question({ timesReported: 0 }), 0), /timesReported/)
})

test('topic validation rejects unknown block types but allows blank table cells', () => {
  assert.doesNotThrow(() => validateTopic(topic(), 0))
  assert.throws(() => validateTopic(topic({ sections: [{ heading: 'h', blocks: [{ type: 'video' }] }] }), 0), /unknown block type/)
  const table = { type: 'table', headers: [{ zh: '' }, { zh: '列' }], rows: [[{ zh: '行' }, { zh: '' }]] }
  assert.doesNotThrow(() => validateTopic(topic({ sections: [{ heading: 'h', blocks: [table] }] }), 0))
  const ragged = { type: 'table', headers: [{ zh: 'a' }, { zh: 'b' }], rows: [[{ zh: '1' }]] }
  assert.throws(() => validateTopic(topic({ sections: [{ heading: 'h', blocks: [ragged] }] }), 0), /exactly 2 cells/)
})

test('a batch rejects duplicate ids inside one submission', () => {
  assert.throws(() => validateBatch([question(), question()], validateQuestion), /same id twice/)
  assert.throws(() => validateBatch([], validateQuestion), /No entries/)
})
