import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatRangeLabel, getPresetRange, validateRange } from './dates.js'

// getPresetRange

test('S13 [정상] 최근 7일: 10/7 → 10/1~10/7', () => {
  assert.deepEqual(getPresetRange('last7', '2026-10-07'), {
    start: '2026-10-01',
    end: '2026-10-07',
  })
})

test('S14 [정상] 최근 14일: 10/7 → 9/24~10/7', () => {
  assert.deepEqual(getPresetRange('last14', '2026-10-07'), {
    start: '2026-09-24',
    end: '2026-10-07',
  })
})

test('S15 [정상] 최근 98일: 10/7 → 7/2~10/7', () => {
  assert.deepEqual(getPresetRange('last98', '2026-10-07'), {
    start: '2026-07-02',
    end: '2026-10-07',
  })
})

test('S16 [정상] 이번 달: 10/7 → 10/1~10/7', () => {
  assert.deepEqual(getPresetRange('thisMonth', '2026-10-07'), {
    start: '2026-10-01',
    end: '2026-10-07',
  })
})

test('S17 [경계] 이번 달, 달의 첫날 10/1 → 10/1~10/1', () => {
  assert.deepEqual(getPresetRange('thisMonth', '2026-10-01'), {
    start: '2026-10-01',
    end: '2026-10-01',
  })
})

test('S18 [경계] 최근 7일, 달이 넘어감 3/3 → 2/25~3/3', () => {
  assert.deepEqual(getPresetRange('last7', '2026-03-03'), {
    start: '2026-02-25',
    end: '2026-03-03',
  })
})

// validateRange

test('S19 [정상] 7/2~10/7 → null', () => {
  assert.equal(validateRange({ start: '2026-07-02', end: '2026-10-07' }), null)
})

test('S20 [경계] 시작일 = 끝일 → null', () => {
  assert.equal(validateRange({ start: '2026-10-07', end: '2026-10-07' }), null)
})

test('S21 [경계] 시작일이 끝일보다 하루 늦음 → 안내 문구', () => {
  assert.equal(
    validateRange({ start: '2026-10-08', end: '2026-10-07' }),
    '시작일이 끝일보다 늦어요',
  )
})

test('S22 [예외] 시작일이 비어 있음 → 안내 문구', () => {
  assert.equal(
    validateRange({ start: '', end: '2026-10-07' }),
    '시작일과 끝일을 골라 주세요',
  )
})

// formatRangeLabel

test('S23 [정상] 7/2~10/7', () => {
  assert.equal(
    formatRangeLabel({ start: '2026-07-02', end: '2026-10-07' }),
    '7/2~10/7',
  )
})

test('S24 [경계] 하루 → 10/7', () => {
  assert.equal(
    formatRangeLabel({ start: '2026-10-07', end: '2026-10-07' }),
    '10/7',
  )
})
