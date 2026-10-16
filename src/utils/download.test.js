import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPresetRange } from './dates.js'
import {
  buildDownloadFileName,
  buildReportsCsv,
  parseReportCsv,
  selectRows,
} from './csv.js'

const LATEST = '2026-10-07'
const RANGE = { start: '2026-07-02', end: '2026-10-07' }

// 보이지 않는 글자라 코드로 만든다
const BOM = String.fromCharCode(0xfeff)
const HEADER =
  '날짜,매체,캠페인,광고그룹,소재,광고비,노출,클릭,장바구니,전환,매출'

function row(reportDate, changes = {}) {
  return {
    reportDate,
    media: 'NAVER',
    campaignName: '가을 세일',
    adGroupName: '검색_브랜드',
    creativeName: '소재A',
    cost: 100000,
    impressions: 25000,
    clicks: 600,
    carts: 80,
    conversions: 20,
    revenue: 350000,
    ...changes,
  }
}

function datesOf(rows) {
  return rows.map((item) => item.reportDate)
}

// getPresetRange (이슈 #19 에서 98일 고정 → 기간 선택으로 바뀜)

test('S1 [정상] 최근 98일: 기준일 10/7 → 7/2~10/7', () => {
  assert.deepEqual(getPresetRange('last98', LATEST), RANGE)
})

// selectRows (고른 기간 = 최근 98일 7/2~10/7)

test('S2 [경계] 7/1 (99일째) → 빠짐', () => {
  const rows = [row('2026-07-01'), row(LATEST)]
  assert.deepEqual(datesOf(selectRows(rows, null, RANGE)), [LATEST])
})

test('S3 [경계] 7/2 (98일째) → 들어감', () => {
  const rows = [row('2026-07-02'), row(LATEST)]
  assert.deepEqual(datesOf(selectRows(rows, null, RANGE)), [
    '2026-07-02',
    LATEST,
  ])
})

test('S4 [경계] 10/7 (기준일) → 들어감', () => {
  assert.deepEqual(datesOf(selectRows([row(LATEST)], null, RANGE)), [LATEST])
})

test('S5 [정상] META 를 고르면 META 줄만', () => {
  const rows = [
    row(LATEST, { media: 'NAVER' }),
    row(LATEST, { media: 'META' }),
    row(LATEST, { media: 'GOOGLE' }),
  ]
  const result = selectRows(rows, 'META', RANGE)
  assert.deepEqual(
    result.map((item) => item.media),
    ['META'],
  )
})

test('S6 [정상] 섞인 순서로 넣어도 날짜 오래된 순', () => {
  const rows = [row('2026-10-03'), row('2026-07-05'), row('2026-09-01')]
  assert.deepEqual(datesOf(selectRows(rows, null, RANGE)), [
    '2026-07-05',
    '2026-09-01',
    '2026-10-03',
  ])
})

// buildReportsCsv

test('S7 [정상] 2줄 → 정확한 CSV 글자', () => {
  const rows = [
    row('2026-10-01'),
    row('2026-10-02', { media: 'META', creativeName: '소재B', cost: 50000 }),
  ]
  assert.equal(
    buildReportsCsv(rows),
    `${BOM}${HEADER}\r\n` +
      '2026-10-01,NAVER,가을 세일,검색_브랜드,소재A,100000,25000,600,80,20,350000\r\n' +
      '2026-10-02,META,가을 세일,검색_브랜드,소재B,50000,25000,600,80,20,350000\r\n',
  )
})

test('S8 [경계] 이름에 쉼표 → 따옴표로 감쌈', () => {
  const csv = buildReportsCsv([row(LATEST, { campaignName: '가을, 세일' })])
  assert.ok(csv.includes(',"가을, 세일",'))
})

test('S9 [경계] 이름에 따옴표 → 따옴표를 두 번', () => {
  const csv = buildReportsCsv([row(LATEST, { creativeName: '"추천" 배너' })])
  assert.ok(csv.includes(',"""추천"" 배너",'))
})

test('S10 [정상] 만든 CSV 를 다시 올리면 원래 줄과 같고 오류 없음', () => {
  const rows = [
    row('2026-10-01'),
    row('2026-10-02', { media: 'META', creativeName: '소재B', cost: 50000 }),
    row('2026-10-03', { campaignName: '가을, 세일' }),
    row('2026-10-04', { creativeName: '"추천" 배너' }),
  ]
  assert.deepEqual(parseReportCsv(buildReportsCsv(rows)), {
    rows,
    errors: [],
  })
})

// buildDownloadFileName

test('S11 [정상] META → adporter_META_2026-07-02_2026-10-07.csv', () => {
  assert.equal(
    buildDownloadFileName('META', RANGE),
    'adporter_META_2026-07-02_2026-10-07.csv',
  )
})

test('S12 [정상] 전체(null) → adporter_전체_2026-07-02_2026-10-07.csv', () => {
  assert.equal(
    buildDownloadFileName(null, RANGE),
    'adporter_전체_2026-07-02_2026-10-07.csv',
  )
})
