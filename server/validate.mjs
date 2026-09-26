/**
 * Structural validation for takken questions and topics. Shared by the API server (authoritative,
 * runs on every write) and by the upsert scripts (fast local fail before any network call).
 *
 * TakkenTopicsView casts topic data with no runtime normalization, so topic validation is strict:
 * every block's `type` and required fields are checked before anything reaches the database.
 */

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

export function validateQuestion(question, index) {
  const where = `entry #${index + 1}`
  if (!isRecord(question)) throw new Error(`${where}: not an object`)
  if (!isNonEmptyString(question.id)) throw new Error(`${where}: missing "id"`)
  if ('timesReported' in question && (typeof question.timesReported !== 'number' || question.timesReported < 1)) {
    throw new Error(`${where} (${question.id}): "timesReported" must be a number >= 1 if provided`)
  }
  for (const field of ['tag', 'title', 'stem', 'explain', 'takeaway']) {
    if (!isNonEmptyString(question[field])) throw new Error(`${where} (${question.id}): missing "${field}"`)
  }

  const options = question.options
  if (!Array.isArray(options) || options.length !== 4) {
    throw new Error(`${where} (${question.id}): "options" must be an array of exactly 4 entries`)
  }

  if (isRecord(options[0])) {
    if (!options.every((option) => isRecord(option) && isNonEmptyString(option.text))) {
      throw new Error(`${where} (${question.id}): every modern option needs a non-empty "text"`)
    }
    const ids = options.map((option) => option.id)
    if (typeof question.correctOptionId !== 'string' || !ids.includes(question.correctOptionId)) {
      throw new Error(`${where} (${question.id}): "correctOptionId" must match one of the options' ids`)
    }
  } else {
    if (!options.every(isNonEmptyString)) {
      throw new Error(`${where} (${question.id}): every legacy option must be a non-empty string`)
    }
    if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct > 3) {
      throw new Error(`${where} (${question.id}): "correct" must be an index 0-3`)
    }
  }
}

// Table headers/cells may legitimately be blank (e.g. the empty top-left corner of a comparison table),
// so they only need a string; every other piece of text must have content.
function validateBilingual(value, where, { allowEmpty = false } = {}) {
  if (!isRecord(value)) throw new Error(`${where}: expected {zh, ja?}`)
  if (typeof value.zh !== 'string' || (!allowEmpty && value.zh.trim() === '')) {
    throw new Error(`${where}: "zh" must be ${allowEmpty ? 'a string' : 'a non-empty string'}`)
  }
  if ('ja' in value && typeof value.ja !== 'string') throw new Error(`${where}: "ja" must be a string if present`)
}

function validateBlock(block, where) {
  if (!isRecord(block)) throw new Error(`${where}: block is not an object`)
  const { type } = block
  if (type === 'text' || type === 'mnemonic' || type === 'trap') {
    validateBilingual(block.content, `${where}.content`)
    return
  }
  if (type === 'list') {
    if (block.style !== 'ordered' && block.style !== 'unordered') throw new Error(`${where}.style must be "ordered" or "unordered"`)
    if (!Array.isArray(block.items) || block.items.length === 0) throw new Error(`${where}.items must be a non-empty array`)
    block.items.forEach((item, i) => validateBilingual(item, `${where}.items[${i}]`))
    return
  }
  if (type === 'table') {
    if (!Array.isArray(block.headers) || block.headers.length === 0) throw new Error(`${where}.headers must be a non-empty array`)
    block.headers.forEach((header, i) => validateBilingual(header, `${where}.headers[${i}]`, { allowEmpty: true }))
    if (!Array.isArray(block.rows) || block.rows.length === 0) throw new Error(`${where}.rows must be a non-empty array`)
    block.rows.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== block.headers.length) {
        throw new Error(`${where}.rows[${i}] must have exactly ${block.headers.length} cells (matching headers)`)
      }
      row.forEach((cell, j) => validateBilingual(cell, `${where}.rows[${i}][${j}]`, { allowEmpty: true }))
    })
    return
  }
  throw new Error(`${where}: unknown block type "${type}" (expected text/list/table/mnemonic/trap)`)
}

export function validateTopic(topic, index) {
  const where = `entry #${index + 1}`
  if (!isRecord(topic)) throw new Error(`${where}: not an object`)
  if (!isNonEmptyString(topic.id)) throw new Error(`${where}: missing "id"`)
  if (!isNonEmptyString(topic.tag)) throw new Error(`${where} (${topic.id}): missing "tag"`)
  validateBilingual(topic.title, `${where} (${topic.id}).title`)
  if (!isNonEmptyString(topic.source)) throw new Error(`${where} (${topic.id}): missing "source"`)
  if (!Array.isArray(topic.sections) || topic.sections.length === 0) {
    throw new Error(`${where} (${topic.id}): "sections" must be a non-empty array`)
  }
  topic.sections.forEach((section, sIndex) => {
    const sectionWhere = `${where} (${topic.id}).sections[${sIndex}]`
    if (!isRecord(section) || !isNonEmptyString(section.heading)) throw new Error(`${sectionWhere}: missing "heading"`)
    if (!Array.isArray(section.blocks) || section.blocks.length === 0) throw new Error(`${sectionWhere}: "blocks" must be a non-empty array`)
    section.blocks.forEach((block, bIndex) => validateBlock(block, `${sectionWhere}.blocks[${bIndex}]`))
  })
}

/** Validates a list of entries and rejects duplicate ids inside the same submission. */
export function validateBatch(entries, validateOne) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('No entries provided.')
  entries.forEach(validateOne)
  const ids = entries.map((entry) => entry.id)
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
  if (duplicate) throw new Error(`Input contains the same id twice: "${duplicate}"`)
}
