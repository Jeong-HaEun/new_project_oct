import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatWon, formatPercent } from './format.js'

// formatWon

test('S50 [정상] 1234 → 1,234원', () => {
  assert.equal(formatWon(1234), '1,234원')
})

test('S51 [경계] 소수점은 반올림', () => {
  assert.equal(formatWon(33333.33), '33,333원')
  assert.equal(formatWon(1234.5), '1,235원')
})

test('S52 [경계] 0 → 0원', () => {
  assert.equal(formatWon(0), '0원')
})

test('S53 [예외] 계산 불가(null) → -', () => {
  assert.equal(formatWon(null), '-')
})

// formatPercent

test('S54 [정상] 350 → 350%', () => {
  assert.equal(formatPercent(350), '350%')
})

test('S55 [경계] 소수점은 반올림', () => {
  assert.equal(formatPercent(349.6), '350%')
})

test('S56 [경계] 0 → 0%', () => {
  assert.equal(formatPercent(0), '0%')
})

test('S57 [예외] 계산 불가(null) → -', () => {
  assert.equal(formatPercent(null), '-')
})
