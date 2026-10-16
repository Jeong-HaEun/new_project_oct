import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getLast14Days } from './dates.js'
import { formatCompactWon } from './format.js'
import { filterByMedia } from './media.js'
import { summarizeDailyTrend } from './metrics.js'

const LATEST = '2026-10-07'

// 시나리오 문서의 기본값: META · 구매 1, 나머지 숫자는 0
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
    conversions: 1,
    revenue: 0,
    ...overrides,
  }
}

function day(result, date) {
  return result.find((item) => item.date === date)
}

// ---- getLast14Days ----

test('S1 [정상] 14일 → 09/24 ~ 10/07', () => {
  const dates = getLast14Days(LATEST)
  assert.equal(dates.length, 14)
  assert.equal(dates[0], '2026-09-24')
  assert.equal(dates[13], '2026-10-07')
})

test('S2 [경계] 달 넘김 → 10/05 기준 첫날 09/22', () => {
  assert.equal(getLast14Days('2026-10-05')[0], '2026-09-22')
})

// ---- summarizeDailyTrend ----

test('S3 [정상] 하루 값 → 10/7 ROAS 350 · CPA 25,000', () => {
  const rows = [row(LATEST, { cost: 100000, revenue: 350000, conversions: 4 })]
  const result = summarizeDailyTrend(rows, LATEST)
  assert.deepEqual(result[13], {
    date: LATEST,
    label: '10/7',
    roas: 350,
    cpa: 25000,
    roasNote: null,
    cpaNote: null,
  })
})

test('S4 [정상] 하루 여러 줄은 합계끼리 → ROAS 180 (평균 300 아님)', () => {
  const rows = [
    row(LATEST, { cost: 20000, revenue: 100000 }),
    row(LATEST, { creativeName: 'B', cost: 80000, revenue: 80000 }),
  ]
  assert.equal(day(summarizeDailyTrend(rows, LATEST), LATEST).roas, 180)
})

test("S5 [경계] 데이터 없는 날 → null + '데이터 없음'", () => {
  const rows = [row(LATEST, { cost: 100000, revenue: 300000 })]
  const empty = day(summarizeDailyTrend(rows, LATEST), '2026-10-06')
  assert.equal(empty.roas, null)
  assert.equal(empty.cpa, null)
  assert.equal(empty.roasNote, '데이터 없음')
  assert.equal(empty.cpaNote, '데이터 없음')
})

test("S6 [경계] 구매 0 → CPA null + '구매 0건이라 계산 불가'", () => {
  const rows = [row(LATEST, { cost: 100000, revenue: 200000, conversions: 0 })]
  const today = day(summarizeDailyTrend(rows, LATEST), LATEST)
  assert.equal(today.roas, 200)
  assert.equal(today.roasNote, null)
  assert.equal(today.cpa, null)
  assert.equal(today.cpaNote, '구매 0건이라 계산 불가')
})

test("S7 [경계] 광고비 0 → ROAS null + '광고비 0원이라 계산 불가'", () => {
  const rows = [row(LATEST, { cost: 0, revenue: 0, conversions: 1 })]
  const today = day(summarizeDailyTrend(rows, LATEST), LATEST)
  assert.equal(today.roas, null)
  assert.equal(today.roasNote, '광고비 0원이라 계산 불가')
})

test('S8 [경계] 14일 경계 → 09/24 는 [0], 09/23 은 없음', () => {
  const rows = [
    row('2026-09-23', { cost: 50000 }),
    row('2026-09-24', { cost: 100000, revenue: 300000 }),
  ]
  const result = summarizeDailyTrend(rows, LATEST)
  assert.equal(result[0].date, '2026-09-24')
  assert.equal(result[0].roas, 300)
  assert.ok(!result.some((item) => item.date === '2026-09-23'))
})

test('S9 [정상] 매체 필터 → NAVER 값만 (ROAS 300)', () => {
  const rows = [
    row(LATEST, { media: 'NAVER', cost: 100000, revenue: 300000 }),
    row(LATEST, { media: 'META', cost: 100000, revenue: 100000 }),
  ]
  const result = summarizeDailyTrend(filterByMedia(rows, 'NAVER'), LATEST)
  assert.equal(day(result, LATEST).roas, 300)
})

test('S10 [예외] 데이터 없음 → []', () => {
  assert.deepEqual(summarizeDailyTrend([], null), [])
})

// ---- formatCompactWon ----

test("S11 [경계] 9,999 → '9,999'", () => {
  assert.equal(formatCompactWon(9999), '9,999')
})

test("S12 [경계] 10,000 → '1만'", () => {
  assert.equal(formatCompactWon(10000), '1만')
})

test("S13 [경계] 10,001 → '1만'", () => {
  assert.equal(formatCompactWon(10001), '1만')
})

test("S14 [정상] 15,000 → '1.5만'", () => {
  assert.equal(formatCompactWon(15000), '1.5만')
})

test("S15 [정상] 125,400 → '12.5만'", () => {
  assert.equal(formatCompactWon(125400), '12.5만')
})
