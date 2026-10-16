import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countRecentDays } from './dates.js'
import { formatCoverage } from './format.js'

const LATEST = '2026-10-07'

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

function rowsFor(dates) {
  return dates.map((date) => row(date))
}

// ---- countRecentDays ----

test('S1 [정상] 7일 꽉 참 → 7', () => {
  const rows = rowsFor([
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ])
  assert.equal(countRecentDays(rows, LATEST), 7)
})

test('S2 [경계] 6일 → 6', () => {
  const rows = rowsFor([
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ])
  assert.equal(countRecentDays(rows, LATEST), 6)
})

test('S3 [경계] 8일 (창 밖 하루 더) → 7, 9/30 은 세지 않음', () => {
  const rows = rowsFor([
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ])
  assert.equal(countRecentDays(rows, LATEST), 7)
})

test('S4 [정상] 3일 → 3', () => {
  const rows = rowsFor(['2026-10-05', '2026-10-06', '2026-10-07'])
  assert.equal(countRecentDays(rows, LATEST), 3)
})

test('S5 [정상] 하루에 여러 줄 → 날짜로 세서 1', () => {
  const rows = [
    row(LATEST, { media: 'NAVER', creativeName: 'A' }),
    row(LATEST, { media: 'META', creativeName: 'B' }),
    row(LATEST, { media: 'GOOGLE', creativeName: 'C' }),
  ]
  assert.equal(countRecentDays(rows, LATEST), 1)
})

test('S6 [경계] 중간에 빈 날 (10/1 · 10/3 · 10/7) → 3', () => {
  const rows = rowsFor(['2026-10-01', '2026-10-03', '2026-10-07'])
  assert.equal(countRecentDays(rows, LATEST), 3)
})

test('S7 [예외] 데이터 없음 (latestDate null) → 0, 오류 없음', () => {
  assert.equal(countRecentDays([], null), 0)
})

// ---- formatCoverage ----

test('S8 [경계] 7일 → null (표시 안 함)', () => {
  assert.equal(formatCoverage(7), null)
})

test("S9 [경계] 6일 → '최근 6일 기준'", () => {
  assert.equal(formatCoverage(6), '최근 6일 기준')
})

test("S10 [경계] 1일 → '최근 1일 기준'", () => {
  assert.equal(formatCoverage(1), '최근 1일 기준')
})

test("S11 [예외] 0일 → '최근 7일 데이터 없음'", () => {
  assert.equal(formatCoverage(0), '최근 7일 데이터 없음')
})
