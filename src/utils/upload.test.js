import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  decodeCsv,
  normalizeDate,
  normalizeNumber,
  parseReportCsv,
  formatUploadResult,
} from './csv.js'

// 보이지 않는 글자라 코드로 만든다
const BOM = String.fromCharCode(0xfeff)

const HEADERS = [
  '날짜',
  '매체',
  '캠페인',
  '광고그룹',
  '소재',
  '광고비',
  '노출',
  '클릭',
  '장바구니',
  '전환',
  '매출',
]

// 공통 예시 2줄 (제목 → 칸 글자)
const RECORD_A = {
  날짜: '2026/10/1',
  매체: 'NAVER',
  캠페인: '가을 세일',
  광고그룹: '검색_브랜드',
  소재: '소재A',
  광고비: '100,000',
  노출: '25000',
  클릭: '600',
  장바구니: '80',
  전환: '20',
  매출: '350000',
}

const RECORD_B = {
  날짜: '2026-10-02',
  매체: 'meta',
  캠페인: '가을 세일',
  광고그룹: '피드_리타겟',
  소재: '소재B',
  광고비: '50000',
  노출: '30000',
  클릭: '450',
  장바구니: '40',
  전환: '10',
  매출: '150000',
}

const ROWS = [
  {
    reportDate: '2026-10-01',
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
  },
  {
    reportDate: '2026-10-02',
    media: 'META',
    campaignName: '가을 세일',
    adGroupName: '피드_리타겟',
    creativeName: '소재B',
    cost: 50000,
    impressions: 30000,
    clicks: 450,
    carts: 40,
    conversions: 10,
    revenue: 150000,
  },
]

// 쉼표·따옴표가 든 칸은 따옴표로 감싼다 (엑셀이 저장하는 모양)
function cell(value) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

// 제목 목록 + 줄 목록 → CSV 글자 (엑셀처럼 CRLF)
function toCsv(records, headers = HEADERS) {
  const lines = [headers.join(',')]
  for (const record of records) {
    lines.push(headers.map((header) => cell(record[header] ?? '')).join(','))
  }
  return lines.join('\r\n')
}

const SAMPLE_CSV = toCsv([RECORD_A, RECORD_B])

// decodeCsv

test('S1 [정상] UTF-8 로 저장한 날짜 → 날짜', () => {
  const bytes = new Uint8Array([0xeb, 0x82, 0xa0, 0xec, 0xa7, 0x9c])
  assert.equal(decodeCsv(bytes.buffer), '날짜')
})

test('S2 [정상] EUC-KR 로 저장한 날짜 (엑셀 기본) → 날짜', () => {
  const bytes = new Uint8Array([0xb3, 0xaf, 0xc2, 0xa5])
  assert.equal(decodeCsv(bytes.buffer), '날짜')
})

test("S3 [예외] 빈 파일 → ''", () => {
  assert.equal(decodeCsv(new Uint8Array([]).buffer), '')
})

// normalizeDate

test("S4 [정상] '2026-10-01' → '2026-10-01'", () => {
  assert.equal(normalizeDate('2026-10-01'), '2026-10-01')
})

test("S5 [정상] '2026/10/1' → '2026-10-01'", () => {
  assert.equal(normalizeDate('2026/10/1'), '2026-10-01')
})

test("S6 [정상] '2026. 10. 1.' (엑셀 한국어 모양) → '2026-10-01'", () => {
  assert.equal(normalizeDate('2026. 10. 1.'), '2026-10-01')
})

test("S7 [정상] '2026.10.01' → '2026-10-01'", () => {
  assert.equal(normalizeDate('2026.10.01'), '2026-10-01')
})

test("S8 [경계] '2026-02-28' → '2026-02-28'", () => {
  assert.equal(normalizeDate('2026-02-28'), '2026-02-28')
})

test("S9 [경계] '2026-02-29' (윤년 아님) → null", () => {
  assert.equal(normalizeDate('2026-02-29'), null)
})

test("S10 [경계] '2026-12-31' → '2026-12-31'", () => {
  assert.equal(normalizeDate('2026-12-31'), '2026-12-31')
})

test("S11 [경계] '2026-13-01' → null", () => {
  assert.equal(normalizeDate('2026-13-01'), null)
})

test("S12 [예외] '10/1/2026' (미국식) → null", () => {
  assert.equal(normalizeDate('10/1/2026'), null)
})

test("S13 [예외] '' → null", () => {
  assert.equal(normalizeDate(''), null)
})

// normalizeNumber

test("S14 [정상] '100,000' → 100000", () => {
  assert.equal(normalizeNumber('100,000'), 100000)
})

test("S15 [정상] ' 2500 ' → 2500", () => {
  assert.equal(normalizeNumber(' 2500 '), 2500)
})

test("S16 [경계] '0' → 0", () => {
  assert.equal(normalizeNumber('0'), 0)
})

test("S17 [경계] '1' → 1", () => {
  assert.equal(normalizeNumber('1'), 1)
})

test("S18 [경계] '-1' → null", () => {
  assert.equal(normalizeNumber('-1'), null)
})

test("S19 [예외] '1.5' → null", () => {
  assert.equal(normalizeNumber('1.5'), null)
})

test("S20 [예외] '100원' → null", () => {
  assert.equal(normalizeNumber('100원'), null)
})

test("S21 [예외] '' → null", () => {
  assert.equal(normalizeNumber(''), null)
})

// parseReportCsv

test('S22 [정상] 양식 그대로 2줄 → 정리된 rows, 오류 없음', () => {
  assert.deepEqual(parseReportCsv(SAMPLE_CSV), { rows: ROWS, errors: [] })
})

test('S23 [정상] 칸 순서가 뒤섞여도 같은 결과', () => {
  const shuffled = ['매출', ...HEADERS.slice(0, -1)].reverse()
  const csv = toCsv([RECORD_A, RECORD_B], shuffled)
  assert.deepEqual(parseReportCsv(csv), { rows: ROWS, errors: [] })
})

test('S24 [정상] 맨 앞 BOM 이 있어도 같은 결과', () => {
  assert.deepEqual(parseReportCsv(BOM + SAMPLE_CSV), {
    rows: ROWS,
    errors: [],
  })
})

test("S25 [정상] 매체 소문자 meta → 'META'", () => {
  assert.equal(parseReportCsv(SAMPLE_CSV).rows[1].media, 'META')
})

test("S26 [정상] 이름에 쉼표 '가을, 세일' → 칸이 밀리지 않음", () => {
  const csv = toCsv([{ ...RECORD_A, 캠페인: '가을, 세일' }])
  const result = parseReportCsv(csv)
  assert.equal(result.rows[0].campaignName, '가을, 세일')
  assert.equal(result.rows[0].cost, 100000)
  assert.deepEqual(result.errors, [])
})

test('S27 [경계] 캠페인 이름 99자 → 오류 없음', () => {
  const csv = toCsv([{ ...RECORD_A, 캠페인: '가'.repeat(99) }])
  assert.deepEqual(parseReportCsv(csv).errors, [])
})

test('S28 [경계] 캠페인 이름 100자 → 오류 없음', () => {
  const csv = toCsv([{ ...RECORD_A, 캠페인: '가'.repeat(100) }])
  assert.deepEqual(parseReportCsv(csv).errors, [])
})

test('S29 [경계] 캠페인 이름 101자 → 100자 이하 오류', () => {
  const csv = toCsv([{ ...RECORD_A, 캠페인: '가'.repeat(101) }])
  assert.deepEqual(parseReportCsv(csv).errors, [
    '2번째 줄: 캠페인 칸은 100자 이하여야 해요',
  ])
})

test('S30 [경계] 엑셀이 끝에 붙인 빈 줄은 무시', () => {
  assert.deepEqual(parseReportCsv(`${SAMPLE_CSV}\r\n\r\n`), {
    rows: ROWS,
    errors: [],
  })
})

test('S31 [예외] 광고비 · 매출 칸이 없음 → 바로 멈춤', () => {
  const headers = HEADERS.filter((h) => h !== '광고비' && h !== '매출')
  const csv = toCsv([RECORD_A], headers)
  assert.deepEqual(parseReportCsv(csv), {
    rows: [],
    errors: ['필요한 칸이 없어요: 광고비, 매출'],
  })
})

test('S32 [예외] 5번째 줄 광고비 -100 → 줄 번호와 함께 오류', () => {
  const csv = toCsv([
    RECORD_A,
    RECORD_B,
    RECORD_A,
    { ...RECORD_B, 광고비: '-100' },
  ])
  assert.deepEqual(parseReportCsv(csv).errors, [
    '5번째 줄: 광고비 칸은 0 이상의 숫자여야 해요',
  ])
})

test('S33 [예외] 2번째 줄 날짜 · 3번째 줄 매체가 틀림 → 줄 순서대로 모두', () => {
  const csv = toCsv([
    { ...RECORD_A, 날짜: '10/1/2026' },
    { ...RECORD_B, 매체: 'KAKAO' },
  ])
  assert.deepEqual(parseReportCsv(csv).errors, [
    '2번째 줄: 날짜 칸은 2026-10-01 모양이어야 해요',
    '3번째 줄: 매체 칸은 NAVER · META · GOOGLE 중 하나여야 해요',
  ])
})

test('S34 [예외] 매체 한글 네이버 → 매체 오류', () => {
  const csv = toCsv([{ ...RECORD_A, 매체: '네이버' }])
  assert.deepEqual(parseReportCsv(csv).errors, [
    '2번째 줄: 매체 칸은 NAVER · META · GOOGLE 중 하나여야 해요',
  ])
})

test('S35 [예외] 소재가 빈칸만 있음 → 비어 있음 오류', () => {
  const csv = toCsv([{ ...RECORD_A, 소재: '  ' }])
  assert.deepEqual(parseReportCsv(csv).errors, [
    '2번째 줄: 소재 칸이 비어 있어요',
  ])
})

test('S36 [예외] 제목 줄만 있음 → 데이터 줄이 없어요', () => {
  assert.deepEqual(parseReportCsv(`${HEADERS.join(',')}\r\n`), {
    rows: [],
    errors: ['데이터 줄이 없어요'],
  })
})

// formatUploadResult

test("S37 [정상] { created: 3, updated: 2 } → '새로 3줄 · 바뀐 2줄'", () => {
  assert.equal(
    formatUploadResult({ created: 3, updated: 2 }),
    '새로 3줄 · 바뀐 2줄',
  )
})

test("S38 [경계] 같은 파일을 다시 올림 { created: 0, updated: 5 } → '새로 0줄 · 바뀐 5줄'", () => {
  assert.equal(
    formatUploadResult({ created: 0, updated: 5 }),
    '새로 0줄 · 바뀐 5줄',
  )
})
