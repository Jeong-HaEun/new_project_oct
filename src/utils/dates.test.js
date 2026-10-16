import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getLatestDate,
  getWeekRanges,
  filterByDateRange,
  countDays,
  getTodayKst,
  getUploadDelayDays,
  formatShortDate,
} from './dates.js'

// 날짜만 있는 줄 목록 만들기
function rowsOf(dates) {
  return dates.map((reportDate) => ({ reportDate }))
}

// start 부터 하루씩 count 일치 날짜 (9월 안에서만 쓴다)
function septemberDays(startDay, count) {
  return Array.from(
    { length: count },
    (_, i) => `2026-09-${String(startDay + i).padStart(2, '0')}`,
  )
}

// getLatestDate

test('S1 [정상] 날짜 순서가 섞여 있어도 가장 마지막 날짜', () => {
  const rows = rowsOf(['2026-10-05', '2026-10-07', '2026-10-06'])
  assert.equal(getLatestDate(rows), '2026-10-07')
})

test('S2 [경계] 1줄뿐이면 그 날짜', () => {
  assert.equal(getLatestDate(rowsOf(['2026-10-07'])), '2026-10-07')
})

test('S3 [예외] 데이터가 없으면 null', () => {
  assert.equal(getLatestDate([]), null)
})

// getWeekRanges

test('S4 [정상] 기준일 10/7 → 이번 10/1~10/7, 전주 9/24~9/30', () => {
  assert.deepEqual(getWeekRanges('2026-10-07'), {
    current: { start: '2026-10-01', end: '2026-10-07' },
    previous: { start: '2026-09-24', end: '2026-09-30' },
  })
})

test('S5 [경계] 달이 넘어감', () => {
  assert.deepEqual(getWeekRanges('2026-03-03'), {
    current: { start: '2026-02-25', end: '2026-03-03' },
    previous: { start: '2026-02-18', end: '2026-02-24' },
  })
})

test('S6 [경계] 해가 넘어감', () => {
  assert.deepEqual(getWeekRanges('2027-01-03'), {
    current: { start: '2026-12-28', end: '2027-01-03' },
    previous: { start: '2026-12-21', end: '2026-12-27' },
  })
})

test('S7 [경계] 윤년 (2/29 있음)', () => {
  assert.deepEqual(getWeekRanges('2028-03-03'), {
    current: { start: '2028-02-26', end: '2028-03-03' },
    previous: { start: '2028-02-19', end: '2028-02-25' },
  })
})

// filterByDateRange

test('S8 [경계] 시작일·끝일은 포함, 하루 전·하루 뒤는 제외', () => {
  const rows = rowsOf(['2026-09-30', '2026-10-01', '2026-10-07', '2026-10-08'])
  const result = filterByDateRange(rows, '2026-10-01', '2026-10-07')
  assert.deepEqual(
    result.map((row) => row.reportDate),
    ['2026-10-01', '2026-10-07'],
  )
})

test('S9 [예외] 데이터가 없으면 빈 목록', () => {
  assert.deepEqual(filterByDateRange([], '2026-10-01', '2026-10-07'), [])
})

// countDays

test('S10 [경계] 전주 6일치 → 6', () => {
  const rows = rowsOf(septemberDays(24, 6))
  assert.equal(countDays(rows, '2026-09-24', '2026-09-30'), 6)
})

test('S11 [경계] 전주 7일치 → 7', () => {
  const rows = rowsOf(septemberDays(24, 7))
  assert.equal(countDays(rows, '2026-09-24', '2026-09-30'), 7)
})

test('S12 [경계] 7일치 + 범위 밖 하루 → 7', () => {
  const rows = rowsOf(septemberDays(23, 8))
  assert.equal(countDays(rows, '2026-09-24', '2026-09-30'), 7)
})

test('S13 [정상] 하루에 3줄 × 7일이어도 날짜 수는 7', () => {
  const dates = septemberDays(24, 7)
  const rows = rowsOf([...dates, ...dates, ...dates])
  assert.equal(countDays(rows, '2026-09-24', '2026-09-30'), 7)
})

// getTodayKst

test('S14 [정상] 한국 오전 9시 30분', () => {
  assert.equal(getTodayKst(new Date('2026-10-08T00:30:00Z')), '2026-10-08')
})

test('S15 [경계] 한국 자정 1초 전이면 아직 그날', () => {
  assert.equal(getTodayKst(new Date('2026-10-07T14:59:59Z')), '2026-10-07')
})

test('S16 [경계] 한국 자정이면 다음 날', () => {
  assert.equal(getTodayKst(new Date('2026-10-07T15:00:00Z')), '2026-10-08')
})

// getUploadDelayDays

test('S17 [경계] 기준일 = 어제 → 0', () => {
  assert.equal(getUploadDelayDays('2026-10-07', '2026-10-08'), 0)
})

test('S18 [경계] 기준일 = 어제 −1 → 1', () => {
  assert.equal(getUploadDelayDays('2026-10-06', '2026-10-08'), 1)
})

test('S19 [경계] 기준일 = 오늘 → 0 (음수 아님)', () => {
  assert.equal(getUploadDelayDays('2026-10-08', '2026-10-08'), 0)
})

test('S20 [정상] 3일 밀림 → 3', () => {
  assert.equal(getUploadDelayDays('2026-10-04', '2026-10-08'), 3)
})

test('S21 [경계] 달이 넘어감 → 2', () => {
  assert.equal(getUploadDelayDays('2026-09-29', '2026-10-02'), 2)
})

// formatShortDate

test('S22 [정상] 한 자리 달·일은 앞의 0을 뺀다', () => {
  assert.equal(formatShortDate('2026-01-01'), '1/1')
  assert.equal(formatShortDate('2026-10-07'), '10/7')
})

test('S23 [정상] 두 자리 달·일은 그대로', () => {
  assert.equal(formatShortDate('2026-12-25'), '12/25')
})
