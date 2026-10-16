import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDownloadFileName, selectRows } from './csv.js'
import { formatWeekdays, toggleWeekday } from './dates.js'

const WEEK = { start: '2026-10-01', end: '2026-10-07' }
const RANGE_98 = { start: '2026-07-02', end: '2026-10-07' }

function row(reportDate, overrides = {}) {
  return {
    reportDate,
    media: 'META',
    campaignName: '캠페인1',
    adGroupName: '그룹1',
    creativeName: 'A',
    cost: 0,
    impressions: 0,
    clicks: 0,
    carts: 0,
    conversions: 0,
    revenue: 0,
    ...overrides,
  }
}

// 10/01(목) ~ 10/07(수) 하루 1줄씩
const WEEK_ROWS = [
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
].map((date) => row(date))

function datesOf(rows) {
  return rows.map((item) => item.reportDate)
}

// ---- toggleWeekday ----

test('S1 [정상] 처음 켜기 → [6]', () => {
  assert.deepEqual(toggleWeekday([], 6), [6])
})

test('S2 [정상] 하나 더 → [6, 0] (월요일 먼저: 토, 일)', () => {
  assert.deepEqual(toggleWeekday([6], 0), [6, 0])
})

test('S3 [정상] 끄기 → [0]', () => {
  assert.deepEqual(toggleWeekday([6, 0], 6), [0])
})

test('S4 [경계] 마지막 하나 끄기 → [] (전체)', () => {
  assert.deepEqual(toggleWeekday([0], 0), [])
})

test('S5 [경계] 5개 → 6개 → [1, 2, 3, 4, 5, 6]', () => {
  assert.deepEqual(toggleWeekday([1, 2, 3, 4, 5], 6), [1, 2, 3, 4, 5, 6])
})

test('S6 [경계] 6개 → 7개 → [] (전체)', () => {
  assert.deepEqual(toggleWeekday([1, 2, 3, 4, 5, 6], 0), [])
})

// ---- formatWeekdays ----

test("S7 [정상] [6, 0] → '토일'", () => {
  assert.equal(formatWeekdays([6, 0]), '토일')
})

test("S8 [경계] 일, 월 순서로 받아도 → '월일'", () => {
  assert.equal(formatWeekdays([0, 1]), '월일')
})

test("S9 [경계] [] → ''", () => {
  assert.equal(formatWeekdays([]), '')
})

// ---- selectRows ----

test('S10 [정상] 요일 전체 → 7줄 (기존 동작)', () => {
  assert.equal(selectRows(WEEK_ROWS, null, WEEK, []).length, 7)
})

test('S11 [정상] 수요일만 → 10/07 1줄', () => {
  assert.deepEqual(datesOf(selectRows(WEEK_ROWS, null, WEEK, [3])), [
    '2026-10-07',
  ])
})

test('S12 [정상] 토 · 일 → 10/03 · 10/04', () => {
  assert.deepEqual(datesOf(selectRows(WEEK_ROWS, null, WEEK, [6, 0])), [
    '2026-10-03',
    '2026-10-04',
  ])
})

test('S13 [정상] 매체 · 기간과 함께 → NAVER 10/07 1줄', () => {
  const rows = ['2026-10-05', '2026-10-06', '2026-10-07'].flatMap((date) => [
    row(date, { media: 'NAVER' }),
    row(date, { media: 'META' }),
  ])
  const range = { start: '2026-10-05', end: '2026-10-07' }
  const result = selectRows(rows, 'NAVER', range, [3])
  assert.deepEqual(
    result.map((item) => [item.reportDate, item.media]),
    [['2026-10-07', 'NAVER']],
  )
})

test('S14 [예외] 고른 요일에 줄 없음 → []', () => {
  const range = { start: '2026-10-01', end: '2026-10-02' }
  assert.deepEqual(selectRows(WEEK_ROWS, null, range, [3]), [])
})

// ---- buildDownloadFileName ----

test('S15 [정상] 요일 전체 → 지금 이름 그대로', () => {
  assert.equal(
    buildDownloadFileName(null, RANGE_98, []),
    'adporter_전체_2026-07-02_2026-10-07.csv',
  )
})

test('S16 [정상] 토 · 일 → 매체 뒤에 토일', () => {
  assert.equal(
    buildDownloadFileName(null, RANGE_98, [6, 0]),
    'adporter_전체_토일_2026-07-02_2026-10-07.csv',
  )
})

test('S17 [정상] META · 수 → adporter_META_수_…', () => {
  assert.equal(
    buildDownloadFileName('META', RANGE_98, [3]),
    'adporter_META_수_2026-07-02_2026-10-07.csv',
  )
})
