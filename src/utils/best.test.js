import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatBestCondition } from './format.js'
import { rankBestCreatives, rankBestCreativesByMedia } from './metrics.js'

const LATEST = '2026-10-07'

// 시나리오 문서의 기본값: 소재마다 다른 캠페인('캠페인-<소재>') · 그룹1 · 10/07, 나머지 숫자는 0
function row(overrides) {
  const creativeName = overrides.creativeName ?? 'A'
  return {
    reportDate: LATEST,
    media: 'META',
    campaignName: `캠페인-${creativeName}`,
    adGroupName: '그룹1',
    creativeName,
    cost: 0,
    impressions: 0,
    clicks: 0,
    carts: 0,
    conversions: 0,
    revenue: 0,
    ...overrides,
  }
}

function names(result) {
  return result.map((item) => item.creativeName)
}

test('S1 [정상] ROAS 높은 순 → B, A, C', () => {
  const rows = [
    row({ creativeName: 'A', cost: 100000, revenue: 300000, conversions: 2 }),
    row({ creativeName: 'B', cost: 200000, revenue: 800000, conversions: 2 }),
    row({ creativeName: 'C', cost: 150000, revenue: 300000, conversions: 2 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST)), ['B', 'A', 'C'])
})

test('S2 [정상] 돌려주는 값 모양 → 이름 3개 · 노출 · 클릭 · 구매 · 광고비 · 매출 · CTR · ROAS · CPA', () => {
  const rows = [
    row({
      creativeName: 'B',
      impressions: 100000,
      clicks: 2000,
      cost: 200000,
      revenue: 800000,
      conversions: 4,
    }),
  ]
  assert.deepEqual(rankBestCreatives(rows, LATEST), [
    {
      campaignName: '캠페인-B',
      adGroupName: '그룹1',
      creativeName: 'B',
      impressions: 100000,
      clicks: 2000,
      conversions: 4,
      cost: 200000,
      revenue: 800000,
      ctr: 2,
      roas: 400,
      cpa: 50000,
    },
  ])
})

test('S3 [정상] 여러 날 합치기 → 하루 6만 원씩 두 날이면 12만 원으로 들어감', () => {
  const day = { cost: 60000, revenue: 120000, conversions: 1 }
  const rows = [
    row({ ...day, reportDate: '2026-10-02' }),
    row({ ...day, reportDate: '2026-10-05' }),
  ]
  const [best] = rankBestCreatives(rows, LATEST)
  assert.equal(best.cost, 120000)
  assert.equal(best.revenue, 240000)
  assert.equal(best.roas, 200)
  assert.equal(best.cpa, 60000)
})

test('S4 [정상] 합계끼리 나누기 → ROAS 250 (날짜별 평균 200 아님)', () => {
  const rows = [
    row({
      reportDate: '2026-10-01',
      cost: 100000,
      revenue: 100000,
      conversions: 1,
    }),
    row({
      reportDate: '2026-10-02',
      cost: 300000,
      revenue: 900000,
      conversions: 1,
    }),
  ]
  const [best] = rankBestCreatives(rows, LATEST)
  assert.equal(best.roas, 250)
})

test('S5 [정상] 같은 캠페인, 다른 광고그룹, 같은 이름 → 캠페인 1위 1개만', () => {
  const rows = [
    row({
      campaignName: '캠페인1',
      adGroupName: 'X',
      creativeName: '봄세일',
      cost: 100000,
      revenue: 300000,
      conversions: 1,
    }),
    row({
      campaignName: '캠페인1',
      adGroupName: 'Y',
      creativeName: '봄세일',
      cost: 100000,
      revenue: 200000,
      conversions: 1,
    }),
  ]
  const result = rankBestCreatives(rows, LATEST)
  assert.deepEqual(
    result.map((item) => [item.adGroupName, item.creativeName, item.roas]),
    [['X', '봄세일', 300]],
  )
})

test('S6 [경계] 광고비 99,999원 → 빠짐', () => {
  const rows = [row({ cost: 99999, revenue: 300000, conversions: 1 })]
  assert.deepEqual(rankBestCreatives(rows, LATEST), [])
})

test('S7 [경계] 광고비 100,000원 → 들어감', () => {
  const rows = [row({ cost: 100000, revenue: 300000, conversions: 1 })]
  assert.equal(rankBestCreatives(rows, LATEST).length, 1)
})

test('S8 [경계] 광고비 100,001원 → 들어감', () => {
  const rows = [row({ cost: 100001, revenue: 300000, conversions: 1 })]
  assert.equal(rankBestCreatives(rows, LATEST).length, 1)
})

test('S9 [경계] 구매 0 / 1 / 2건 → 0건만 빠짐', () => {
  const base = { cost: 100000, revenue: 300000 }
  const rows = [
    row({ ...base, creativeName: 'Z', conversions: 0 }),
    row({ ...base, creativeName: 'O', conversions: 1 }),
    row({ ...base, creativeName: 'T', conversions: 2 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST)).sort(), ['O', 'T'])
})

test('S10 [경계] 조건 맞는 소재 4 / 5 / 6개 → 4 / 5 / 5개', () => {
  const revenues = [600000, 500000, 400000, 300000, 200000, 150000]
  const all = revenues.map((revenue, index) =>
    row({
      creativeName: `소재${index + 1}`,
      cost: 100000,
      revenue,
      conversions: 1,
    }),
  )
  assert.equal(rankBestCreatives(all.slice(0, 4), LATEST).length, 4)
  assert.equal(rankBestCreatives(all.slice(0, 5), LATEST).length, 5)

  const six = rankBestCreatives(all, LATEST)
  assert.equal(six.length, 5)
  assert.ok(!names(six).includes('소재6'))
})

test('S11 [경계] 7일째(10/01)는 들어가고 8일째(09/30)는 합계에서 빠짐', () => {
  const rows = [
    row({
      reportDate: '2026-10-01',
      cost: 100000,
      revenue: 300000,
      conversions: 1,
    }),
    row({
      reportDate: '2026-09-30',
      cost: 100000,
      revenue: 900000,
      conversions: 1,
    }),
  ]
  const [best] = rankBestCreatives(rows, LATEST)
  assert.equal(best.cost, 100000)
  assert.equal(best.revenue, 300000)
  assert.equal(best.roas, 300)
})

test('S12 [경계] ROAS 동점 → 매출 큰 B 먼저', () => {
  const rows = [
    row({ creativeName: 'A', cost: 100000, revenue: 300000, conversions: 1 }),
    row({ creativeName: 'B', cost: 200000, revenue: 600000, conversions: 1 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST)), ['B', 'A'])
})

test('S13 [예외] 조건 맞는 소재 없음 → []', () => {
  const rows = [
    row({ creativeName: 'A', cost: 50000, revenue: 300000, conversions: 1 }),
    row({ creativeName: 'B', cost: 50000, revenue: 300000, conversions: 1 }),
  ]
  assert.deepEqual(rankBestCreatives(rows, LATEST), [])
})

test('S14 [예외] 데이터 없음 (latestDate null) → [] (오류 없음)', () => {
  assert.deepEqual(rankBestCreatives([], null), [])
})

// ---- [전체] 매체별 3개 (결정 4) ----

function byMedia(result) {
  return result.map(({ media, items }) => [media, names(items)])
}

test('S15 [정상] 3개 매체가 섞여 있음 → NAVER, META, GOOGLE 순서, 매체 안에서만 순위', () => {
  const base = { cost: 100000, conversions: 1 }
  const rows = [
    row({ ...base, media: 'GOOGLE', creativeName: 'G', revenue: 500000 }),
    row({ ...base, media: 'NAVER', creativeName: 'N1', revenue: 300000 }),
    row({ ...base, media: 'META', creativeName: 'M', revenue: 400000 }),
    row({ ...base, media: 'NAVER', creativeName: 'N2', revenue: 200000 }),
  ]
  assert.deepEqual(byMedia(rankBestCreativesByMedia(rows, LATEST)), [
    ['NAVER', ['N1', 'N2']],
    ['META', ['M']],
    ['GOOGLE', ['G']],
  ])
})

test('S16 [정상] 같은 소재가 다른 매체에 → 매체끼리 섞어 합치지 않음', () => {
  const half = {
    creativeName: '봄세일',
    cost: 60000,
    revenue: 300000,
    conversions: 1,
  }
  const rows = [
    row({ ...half, media: 'NAVER' }),
    row({ ...half, media: 'META' }),
  ]
  assert.deepEqual(byMedia(rankBestCreativesByMedia(rows, LATEST)), [
    ['NAVER', []],
    ['META', []],
    ['GOOGLE', []],
  ])
})

test('S17 [경계] 한 매체만 조건 맞는 소재 없음 → 3개 모두 남음', () => {
  const rows = [
    row({
      media: 'NAVER',
      creativeName: 'N',
      cost: 100000,
      revenue: 300000,
      conversions: 1,
    }),
    row({
      media: 'META',
      creativeName: 'M',
      cost: 50000,
      revenue: 300000,
      conversions: 1,
    }),
  ]
  assert.deepEqual(byMedia(rankBestCreativesByMedia(rows, LATEST)), [
    ['NAVER', ['N']],
    ['META', []],
    ['GOOGLE', []],
  ])
})

test('S18 [예외] 데이터 없음 → 3개 매체 모두 빈 목록', () => {
  assert.deepEqual(rankBestCreativesByMedia([], null), [
    { media: 'NAVER', items: [] },
    { media: 'META', items: [] },
    { media: 'GOOGLE', items: [] },
  ])
})

// ---- 캠페인당 1개 (결정 5) ----

const ONE = { cost: 100000, conversions: 1 }

test('S19 [정상] 같은 캠페인 소재 2개 → 캠페인 1위만 (A, C)', () => {
  const rows = [
    row({ ...ONE, campaignName: 'P', creativeName: 'A', revenue: 400000 }),
    row({ ...ONE, campaignName: 'P', creativeName: 'B', revenue: 300000 }),
    row({ ...ONE, campaignName: 'Q', creativeName: 'C', revenue: 200000 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST)), ['A', 'C'])
})

test('S20 [정상] 같은 소재 이름, 다른 캠페인 → 둘 다 보임', () => {
  const rows = [
    row({ ...ONE, campaignName: 'P', creativeName: '봄세일', revenue: 300000 }),
    row({ ...ONE, campaignName: 'Q', creativeName: '봄세일', revenue: 200000 }),
  ]
  const result = rankBestCreatives(rows, LATEST)
  assert.deepEqual(
    result.map((item) => [item.campaignName, item.creativeName, item.roas]),
    [
      ['P', '봄세일', 300],
      ['Q', '봄세일', 200],
    ],
  )
})

test('S21 [경계] 캠페인 1위가 조건 미달 → 그 캠페인 다음 소재가 대표', () => {
  const rows = [
    row({
      campaignName: 'P',
      creativeName: 'A',
      cost: 50000,
      revenue: 250000,
      conversions: 1,
    }),
    row({ ...ONE, campaignName: 'P', creativeName: 'B', revenue: 300000 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST)), ['B'])
})

// ---- 순위 기준 · 칸 (결정 6) ----

const BY_CONVERSIONS = { sortBy: 'conversions' }

test('S22 [정상] 구매수 순 → A, C, B', () => {
  const rows = [
    row({ creativeName: 'A', cost: 100000, conversions: 10, revenue: 200000 }),
    row({ creativeName: 'B', cost: 100000, conversions: 5, revenue: 500000 }),
    row({ creativeName: 'C', cost: 100000, conversions: 8, revenue: 300000 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST, BY_CONVERSIONS)), [
    'A',
    'C',
    'B',
  ])
})

test('S23 [경계] 구매수 동점 → ROAS 높은 B 먼저', () => {
  const rows = [
    row({ creativeName: 'A', cost: 100000, conversions: 5, revenue: 200000 }),
    row({ creativeName: 'B', cost: 100000, conversions: 5, revenue: 400000 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST, BY_CONVERSIONS)), [
    'B',
    'A',
  ])
})

test('S24 [정상] 구매수 기준이면 캠페인 대표도 구매 1위 → B, C', () => {
  const rows = [
    row({
      campaignName: 'P',
      creativeName: 'A',
      cost: 100000,
      conversions: 3,
      revenue: 500000,
    }),
    row({
      campaignName: 'P',
      creativeName: 'B',
      cost: 100000,
      conversions: 9,
      revenue: 200000,
    }),
    row({
      campaignName: 'Q',
      creativeName: 'C',
      cost: 100000,
      conversions: 5,
      revenue: 300000,
    }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST, BY_CONVERSIONS)), [
    'B',
    'C',
  ])
})

test('S25 [정상] CTR → 노출 10,000 · 클릭 235 이면 2.35', () => {
  const rows = [
    row({
      impressions: 10000,
      clicks: 235,
      cost: 100000,
      conversions: 1,
      revenue: 300000,
    }),
  ]
  assert.equal(rankBestCreatives(rows, LATEST)[0].ctr, 2.35)
})

test('S26 [예외] 노출 0 → CTR null', () => {
  const rows = [
    row({
      impressions: 0,
      clicks: 0,
      cost: 100000,
      conversions: 1,
      revenue: 300000,
    }),
  ]
  assert.equal(rankBestCreatives(rows, LATEST)[0].ctr, null)
})

// ---- 조건 버튼 (결정 7) ----

test('S27 [경계] 최소 광고비 30만 → 299,999 빠지고 300,000 · 300,001 들어감', () => {
  const rows = [
    row({ creativeName: 'A', cost: 299999, conversions: 1, revenue: 900000 }),
    row({ creativeName: 'B', cost: 300000, conversions: 1, revenue: 900000 }),
    row({ creativeName: 'C', cost: 300001, conversions: 1, revenue: 900000 }),
  ]
  const result = rankBestCreatives(rows, LATEST, { minCost: 300000 })
  assert.deepEqual(names(result).sort(), ['B', 'C'])
})

test('S28 [경계] 최소 광고비 제한 없음 → 광고비 0원 소재는 ROAS null 이라 맨 뒤', () => {
  const rows = [
    row({ creativeName: 'A', cost: 0, conversions: 1, revenue: 0 }),
    row({ creativeName: 'B', cost: 50000, conversions: 1, revenue: 100000 }),
  ]
  assert.deepEqual(names(rankBestCreatives(rows, LATEST, { minCost: 0 })), [
    'B',
    'A',
  ])
})

test('S29 [경계] 최소 구매 5건 → 4건 빠지고 5 · 6건 들어감', () => {
  const rows = [
    row({ creativeName: 'A', cost: 100000, conversions: 4, revenue: 300000 }),
    row({ creativeName: 'B', cost: 100000, conversions: 5, revenue: 300000 }),
    row({ creativeName: 'C', cost: 100000, conversions: 6, revenue: 300000 }),
  ]
  const result = rankBestCreatives(rows, LATEST, { minConversions: 5 })
  assert.deepEqual(names(result).sort(), ['B', 'C'])
})

test('S30 [정상] [전체] 에도 옵션이 그대로 → NAVER 구매수 순 A, B', () => {
  const rows = [
    row({
      media: 'NAVER',
      creativeName: 'A',
      cost: 100000,
      conversions: 10,
      revenue: 200000,
    }),
    row({
      media: 'NAVER',
      creativeName: 'B',
      cost: 100000,
      conversions: 2,
      revenue: 500000,
    }),
  ]
  assert.deepEqual(
    byMedia(rankBestCreativesByMedia(rows, LATEST, BY_CONVERSIONS)),
    [
      ['NAVER', ['A', 'B']],
      ['META', []],
      ['GOOGLE', []],
    ],
  )
})

// ---- 조건 글 (formatBestCondition) ----

test('S31 [정상] 기본 조건 글', () => {
  assert.equal(
    formatBestCondition({ minCost: 100000, minConversions: 1 }),
    '광고비 10만 원 이상 · 구매 1건 이상',
  )
})

test('S32 [경계] 광고비 제한 없음', () => {
  assert.equal(
    formatBestCondition({ minCost: 0, minConversions: 5 }),
    '광고비 제한 없음 · 구매 5건 이상',
  )
})

test('S33 [경계] 가장 큰 값', () => {
  assert.equal(
    formatBestCondition({ minCost: 1000000, minConversions: 30 }),
    '광고비 100만 원 이상 · 구매 30건 이상',
  )
})
