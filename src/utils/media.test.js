import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMedia, filterByMedia } from './media.js'
import { summarizeCards } from './metrics.js'

// 매체·날짜·숫자만 바꿔 쓰는 줄 하나
function row(media, reportDate = '2026-10-07', numbers = {}) {
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

// 예시 데이터: 10/1~10/7 매일 NAVER 10,000·35,000·2 / META 5,000·20,000·1
function naverRows() {
  return DATES.map((date) =>
    row('NAVER', date, { cost: 10000, revenue: 35000, conversions: 2 }),
  )
}

function metaRows(dates = DATES) {
  return dates.map((date) =>
    row('META', date, { cost: 5000, revenue: 20000, conversions: 1 }),
  )
}

// 카드 4개에서 이번 주 값만 { cost, revenue, roas, cpa } 로 뽑기
function currentValues(cards) {
  return Object.fromEntries(cards.map((card) => [card.key, card.current]))
}

// 섞인 데이터: NAVER 2줄 · META 3줄 · GOOGLE 1줄
const MIXED = [
  row('NAVER', '2026-10-01'),
  row('META', '2026-10-01'),
  row('GOOGLE', '2026-10-02'),
  row('META', '2026-10-02'),
  row('NAVER', '2026-10-03'),
  row('META', '2026-10-03'),
]

// parseMedia

test('S1 [정상] META → META', () => {
  assert.equal(parseMedia('META'), 'META')
})

test('S2 [정상] NAVER → NAVER', () => {
  assert.equal(parseMedia('NAVER'), 'NAVER')
})

test('S3 [정상] GOOGLE → GOOGLE', () => {
  assert.equal(parseMedia('GOOGLE'), 'GOOGLE')
})

test('S4 [정상] 소문자 meta → META', () => {
  assert.equal(parseMedia('meta'), 'META')
})

test('S5 [경계] 대소문자 섞인 Meta → META', () => {
  assert.equal(parseMedia('Meta'), 'META')
})

test('S6 [경계] 한 글자 모자란 MET → null', () => {
  assert.equal(parseMedia('MET'), null)
})

test('S7 [경계] 한 글자 많은 METAA → null', () => {
  assert.equal(parseMedia('METAA'), null)
})

test('S8 [예외] 없는 매체 KAKAO → null', () => {
  assert.equal(parseMedia('KAKAO'), null)
})

test('S9 [예외] 주소에 media 없음(null) → null', () => {
  assert.equal(parseMedia(null), null)
})

test("S10 [예외] 빈칸 '' → null", () => {
  assert.equal(parseMedia(''), null)
})

// filterByMedia

test('S11 [정상] 섞인 6줄에서 META → META 3줄', () => {
  const result = filterByMedia(MIXED, 'META')
  assert.equal(result.length, 3)
  assert.ok(result.every((r) => r.media === 'META'))
})

test('S12 [정상] null(전체) → 6줄 그대로', () => {
  assert.deepEqual(filterByMedia(MIXED, null), MIXED)
})

test('S13 [경계] META 0줄 → []', () => {
  const rows = [
    row('NAVER', '2026-10-01'),
    row('NAVER', '2026-10-02'),
    row('GOOGLE', '2026-10-03'),
  ]
  assert.deepEqual(filterByMedia(rows, 'META'), [])
})

test('S14 [경계] META 1줄 → 그 1줄', () => {
  const metaRow = row('META', '2026-10-03')
  const rows = [row('NAVER', '2026-10-01'), row('NAVER', '2026-10-02'), metaRow]
  assert.deepEqual(filterByMedia(rows, 'META'), [metaRow])
})

test('S15 [예외] 데이터 없음 → []', () => {
  assert.deepEqual(filterByMedia([], 'META'), [])
})

// 카드와 합쳐 보기 (기준일은 전체 데이터 기준, 결정 A)

test('S16 [정상] META 만 계산', () => {
  const rows = [...naverRows(), ...metaRows()]
  const cards = summarizeCards(filterByMedia(rows, 'META'), '2026-10-07')
  assert.deepEqual(currentValues(cards), {
    cost: 35000,
    revenue: 140000,
    roas: 400,
    cpa: 5000,
  })
})

test('S17 [경계] META 마지막 날(10/5)이 전체(10/7)보다 이름 → 10/1~10/7 META', () => {
  const rows = [...naverRows(), ...metaRows(DATES.slice(0, 5))]
  const cards = summarizeCards(filterByMedia(rows, 'META'), '2026-10-07')
  assert.deepEqual(currentValues(cards), {
    cost: 25000,
    revenue: 100000,
    roas: 400,
    cpa: 5000,
  })
})

test('S18 [경계] 최근 7일에 META 없음 → 0 · 0 · null · null', () => {
  const cards = summarizeCards(filterByMedia(naverRows(), 'META'), '2026-10-07')
  assert.deepEqual(currentValues(cards), {
    cost: 0,
    revenue: 0,
    roas: null,
    cpa: null,
  })
})
