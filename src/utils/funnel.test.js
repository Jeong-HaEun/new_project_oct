import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcRate, summarizeFunnel, compareFunnelByMedia } from './metrics.js'
import { formatRate, formatCount } from './format.js'
import { filterByMedia } from './media.js'

const LATEST = '2026-10-07'

// 매체·날짜·숫자만 바꿔 쓰는 줄 하나
function row(media, reportDate, numbers = {}) {
  return {
    reportDate,
    media,
    campaignName: '가을 세일',
    adGroupName: '검색_브랜드',
    creativeName: '소재A',
    cost: 0,
    impressions: 0,
    clicks: 0,
    carts: 0,
    conversions: 0,
    revenue: 0,
    ...numbers,
  }
}

const DATES = [
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
]

// 예시 A: 10/1~10/7 매일 노출 1,000 · 클릭 50 · 장바구니 10 · 구매 2
function sampleA() {
  return DATES.map((date) =>
    row('NAVER', date, {
      impressions: 1000,
      clicks: 50,
      carts: 10,
      conversions: 2,
    }),
  )
}

// 예시 B: 최근 7일 매체별 합계 (10/7 하루에 몰아 둠). changes 로 매체별 숫자를 바꾼다
const SAMPLE_B = {
  NAVER: { impressions: 10000, clicks: 300, carts: 60, conversions: 12 },
  META: { impressions: 10000, clicks: 200, carts: 50, conversions: 15 },
  GOOGLE: { impressions: 10000, clicks: 400, carts: 40, conversions: 10 },
}

function sampleB(changes = {}, mediaList = ['NAVER', 'META', 'GOOGLE']) {
  return mediaList.map((media) =>
    row(media, LATEST, { ...SAMPLE_B[media], ...changes[media] }),
  )
}

function rateOf(result, media) {
  return result.byMedia.find((item) => item.media === media).rates
}

const NO_RATES = { ctr: null, cartRate: null, purchaseRate: null }
const NO_LOWEST = { ctr: [], cartRate: [], purchaseRate: [] }

// calcRate

test('S1 [정상] 235 ÷ 10,000 → 2.35', () => {
  assert.equal(calcRate(235, 10000), 2.35)
})

test('S2 [경계] 분모 0 → null', () => {
  assert.equal(calcRate(5, 0), null)
})

test('S3 [경계] 분모 1 (1 ÷ 1) → 100', () => {
  assert.equal(calcRate(1, 1), 100)
})

test('S4 [경계] 분자 0 → 0', () => {
  assert.equal(calcRate(0, 100), 0)
})

// formatRate

test("S5 [정상] 2.35 → '2.35%'", () => {
  assert.equal(formatRate(2.35), '2.35%')
})

test("S6 [경계] 12.344 → '12.34%' (버림)", () => {
  assert.equal(formatRate(12.344), '12.34%')
})

test("S7 [경계] 12.346 → '12.35%' (올림)", () => {
  assert.equal(formatRate(12.346), '12.35%')
})

test("S8 [경계] 0 → '0.00%'", () => {
  assert.equal(formatRate(0), '0.00%')
})

test("S9 [예외] null → '-'", () => {
  assert.equal(formatRate(null), '-')
})

// summarizeFunnel

test('S10 [정상] 예시 A → 단계 7,000/350/70/14, 비율 5/20/20', () => {
  assert.deepEqual(summarizeFunnel(sampleA(), LATEST), {
    stages: [
      { key: 'impressions', label: '노출', count: 7000 },
      { key: 'clicks', label: '클릭', count: 350 },
      { key: 'carts', label: '장바구니', count: 70 },
      { key: 'conversions', label: '구매', count: 14 },
    ],
    rates: [
      { key: 'ctr', label: 'CTR', value: 5 },
      { key: 'cartRate', label: '담기율', value: 20 },
      { key: 'purchaseRate', label: '장바구니→구매율', value: 20 },
    ],
  })
})

test('S11 [경계] 9/30 은 빠지고 10/1 · 10/7 은 들어감 → 노출 200', () => {
  const rows = ['2026-09-30', '2026-10-01', '2026-10-07'].map((date) =>
    row('NAVER', date, { impressions: 100 }),
  )
  assert.equal(summarizeFunnel(rows, LATEST).stages[0].count, 200)
})

test('S12 [경계] 클릭 0 → 비율 0 / null / null', () => {
  const rows = [row('NAVER', LATEST, { impressions: 7000 })]
  const values = summarizeFunnel(rows, LATEST).rates.map((rate) => rate.value)
  assert.deepEqual(values, [0, null, null])
})

test('S13 [경계] 장바구니만 0 → 비율 5 / 0 / null', () => {
  const rows = [row('NAVER', LATEST, { impressions: 7000, clicks: 350 })]
  const values = summarizeFunnel(rows, LATEST).rates.map((rate) => rate.value)
  assert.deepEqual(values, [5, 0, null])
})

test('S14 [예외] 최근 7일에 데이터 없음 → 단계 모두 0, 비율 모두 null', () => {
  const rows = [row('NAVER', '2026-09-30', { impressions: 100, clicks: 10 })]
  const result = summarizeFunnel(rows, LATEST)
  assert.deepEqual(
    result.stages.map((stage) => stage.count),
    [0, 0, 0, 0],
  )
  assert.deepEqual(
    result.rates.map((rate) => rate.value),
    [null, null, null],
  )
})

test('S15 [정상] META 만 (필터 적용) → 단계 10,000/200/50/15, 비율 2/25/30', () => {
  const result = summarizeFunnel(filterByMedia(sampleB(), 'META'), LATEST)
  assert.deepEqual(
    result.stages.map((stage) => stage.count),
    [10000, 200, 50, 15],
  )
  assert.deepEqual(
    result.rates.map((rate) => rate.value),
    [2, 25, 30],
  )
})

// compareFunnelByMedia

test('S16 [정상] 예시 B → 3매체 비율과 단계별 최저', () => {
  assert.deepEqual(compareFunnelByMedia(sampleB(), LATEST), {
    byMedia: [
      { media: 'NAVER', rates: { ctr: 3, cartRate: 20, purchaseRate: 20 } },
      { media: 'META', rates: { ctr: 2, cartRate: 25, purchaseRate: 30 } },
      { media: 'GOOGLE', rates: { ctr: 4, cartRate: 10, purchaseRate: 25 } },
    ],
    lowest: { ctr: ['META'], cartRate: ['GOOGLE'], purchaseRate: ['NAVER'] },
  })
})

test('S17 [경계] 동점 (NAVER · META CTR 2) → 둘 다 최저', () => {
  const result = compareFunnelByMedia(
    sampleB({ NAVER: { clicks: 200 } }),
    LATEST,
  )
  assert.deepEqual(result.lowest.ctr, ['NAVER', 'META'])
})

test('S18 [경계] 값 있는 매체 1개 (GOOGLE) → 최저 없음', () => {
  const result = compareFunnelByMedia(sampleB({}, ['GOOGLE']), LATEST)
  assert.deepEqual(rateOf(result, 'GOOGLE'), {
    ctr: 4,
    cartRate: 10,
    purchaseRate: 25,
  })
  assert.deepEqual(rateOf(result, 'NAVER'), NO_RATES)
  assert.deepEqual(rateOf(result, 'META'), NO_RATES)
  assert.deepEqual(result.lowest, NO_LOWEST)
})

test('S19 [경계] 값 있는 매체 2개 (NAVER · META) → 둘 중 최저', () => {
  const result = compareFunnelByMedia(sampleB({}, ['NAVER', 'META']), LATEST)
  assert.deepEqual(result.lowest, {
    ctr: ['META'],
    cartRate: ['NAVER'],
    purchaseRate: ['NAVER'],
  })
})

test('S20 [예외] META 클릭 0 → META 비율 0/null/null, null 은 비교에서 빠짐', () => {
  const result = compareFunnelByMedia(
    sampleB({ META: { clicks: 0, carts: 0, conversions: 0 } }),
    LATEST,
  )
  assert.deepEqual(rateOf(result, 'META'), {
    ctr: 0,
    cartRate: null,
    purchaseRate: null,
  })
  assert.deepEqual(result.lowest, {
    ctr: ['META'],
    cartRate: ['GOOGLE'],
    purchaseRate: ['NAVER'],
  })
})

test('S21 [예외] 데이터 없음 → 비율 모두 null, 최저 없음', () => {
  assert.deepEqual(compareFunnelByMedia([], LATEST), {
    byMedia: [
      { media: 'NAVER', rates: NO_RATES },
      { media: 'META', rates: NO_RATES },
      { media: 'GOOGLE', rates: NO_RATES },
    ],
    lowest: NO_LOWEST,
  })
})

test('S27 [경계] 세 매체 CTR 모두 2 → CTR 최저 없음', () => {
  const result = compareFunnelByMedia(
    sampleB({ NAVER: { clicks: 200 }, GOOGLE: { clicks: 200 } }),
    LATEST,
  )
  assert.deepEqual(result.lowest.ctr, [])
})

test('S28 [경계] 값 있는 매체 2개가 동점 → CTR 최저 없음', () => {
  const result = compareFunnelByMedia(
    sampleB({ NAVER: { clicks: 200 } }, ['NAVER', 'META']),
    LATEST,
  )
  assert.deepEqual(result.lowest.ctr, [])
})

// formatCount

test("S22 [정상] 1234567 → '1,234,567'", () => {
  assert.equal(formatCount(1234567), '1,234,567')
})

test("S23 [경계] 999 → '999'", () => {
  assert.equal(formatCount(999), '999')
})

test("S24 [경계] 1000 → '1,000' (쉼표가 처음 생김)", () => {
  assert.equal(formatCount(1000), '1,000')
})

test("S25 [경계] 1001 → '1,001'", () => {
  assert.equal(formatCount(1001), '1,001')
})

test("S26 [경계] 0 → '0'", () => {
  assert.equal(formatCount(0), '0')
})
