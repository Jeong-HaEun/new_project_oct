// 날짜 계산 함수 모음. 날짜는 "YYYY-MM-DD" 문자열로 주고받는다.
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'

// 기준일에서 days 일 전 날짜 문자열
function daysBefore(date, days) {
  return format(subDays(parseISO(date), days), 'yyyy-MM-dd')
}

export function getLatestDate(rows) {
  if (rows.length === 0) return null
  return rows.reduce(
    (latest, row) => (row.reportDate > latest ? row.reportDate : latest),
    rows[0].reportDate,
  )
}

// 최근 7일 = 기준일 포함 7일, 전주 = 그 바로 앞 7일
export function getWeekRanges(latestDate) {
  return {
    current: { start: daysBefore(latestDate, 6), end: latestDate },
    previous: {
      start: daysBefore(latestDate, 13),
      end: daysBefore(latestDate, 7),
    },
  }
}

// "YYYY-MM-DD" 는 글자 순서 = 날짜 순서라서 문자열로 비교한다
export function filterByDateRange(rows, start, end) {
  return rows.filter((row) => row.reportDate >= start && row.reportDate <= end)
}

export function countDays(rows, start, end) {
  const dates = filterByDateRange(rows, start, end).map((row) => row.reportDate)
  return new Set(dates).size
}

// 누가 어디서 보든 한국 시간 기준 오늘 (en-CA 는 YYYY-MM-DD 모양으로 나온다)
// 테스트는 now 를 넘기고, 화면은 비워 두면 지금 시각을 쓴다
export function getTodayKst(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// 어제까지 올라와 있으면 0, 그보다 밀린 날 수
export function getUploadDelayDays(latestDate, today) {
  const days = differenceInCalendarDays(parseISO(today), parseISO(latestDate))
  return Math.max(0, days - 1)
}

export function formatShortDate(date) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}

// ---- MoM 같은 기간 (이슈 #13) ----

// 이번 달 1일~기준일, 지난달 같은 기간 (지난달에 그 날짜가 없으면 말일까지)
export function getMonthToDateRanges(latestDate) {
  const date = parseISO(latestDate)
  // subMonths 는 없는 날짜를 그 달 말일로 맞춘다 (3/31 → 2/28)
  const previousEnd = subMonths(date, 1)
  return {
    current: { start: toDateText(startOfMonth(date)), end: latestDate },
    previous: {
      start: toDateText(startOfMonth(previousEnd)),
      end: toDateText(previousEnd),
    },
  }
}

// 기간에 들어 있는 날 수 (시작 · 끝 포함)
export function getRangeLength({ start, end }) {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
}

function toDateText(date) {
  return format(date, 'yyyy-MM-dd')
}

// { start, end } → '9월 1~7일' (하루면 '9월 1일')
export function formatMonthRange({ start, end }) {
  const [, month, startDay] = start.split('-').map(Number)
  const endDay = Number(end.split('-')[2])
  if (start === end) return `${month}월 ${startDay}일`
  return `${month}월 ${startDay}~${endDay}일`
}

// ---- 원본 데이터 기간 (이슈 #19) ----

// 빠른 버튼 순서
export const RANGE_PRESETS = [
  { key: 'last7', label: '최근 7일' },
  { key: 'last14', label: '최근 14일' },
  { key: 'last98', label: '최근 98일' },
  { key: 'thisMonth', label: '이번 달' },
]

// 빠른 버튼의 기간 (모두 기준일에서 끝남)
// 최근 N일은 기준일 포함 N일, 이번 달은 1일~기준일
const PRESET_DAYS = { last7: 7, last14: 14, last98: 98 }

export function getPresetRange(presetKey, latestDate) {
  if (presetKey === 'thisMonth') {
    return getMonthToDateRanges(latestDate).current
  }
  return {
    start: daysBefore(latestDate, PRESET_DAYS[presetKey] - 1),
    end: latestDate,
  }
}

// 비었거나 시작일이 끝일보다 늦으면 안내 문구, 괜찮으면 null
export function validateRange({ start, end }) {
  if (!start || !end) return '시작일과 끝일을 골라 주세요'
  // "YYYY-MM-DD" 는 글자 순서 = 날짜 순서
  if (start > end) return '시작일이 끝일보다 늦어요'
  return null
}

// { start, end } → '7/2~10/7' (하루면 '10/7')
export function formatRangeLabel({ start, end }) {
  if (start === end) return formatShortDate(end)
  return `${formatShortDate(start)}~${formatShortDate(end)}`
}

// 최근 7일 안에 데이터가 있는 날 수 0~7 (이슈 #11, 매체 필터를 거친 줄을 받는다)
export function countRecentDays(rows, latestDate) {
  if (latestDate === null) return 0
  const { current } = getWeekRanges(latestDate)
  return countDays(rows, current.start, current.end)
}

// 기준일과 같은 요일 4개 (최신 먼저): 기준일, 7일 전, 14일 전, 21일 전 (이슈 #18, #31 에서 14주 → 4주)
const SAME_WEEKDAY_WEEKS = 4

export function getSameWeekdayDates(latestDate) {
  return Array.from({ length: SAME_WEEKDAY_WEEKS }, (_, week) =>
    daysBefore(latestDate, week * 7),
  )
}

// getDay() 순서: 0 = 일요일
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

// '2026-10-07' → '10/7(수)'
export function formatWeekdayDate(date) {
  return `${formatShortDate(date)}(${WEEKDAY_NAMES[parseISO(date).getDay()]})`
}

// ---- 월 누적 선 그래프 (이슈 #24) ----

// 기준일이 속한 달 + 그 전 2개월 (오래된 달 먼저). 지난 달은 1일~말일, 이번 달은 1일~기준일
export function getRecentMonthRanges(latestDate) {
  const date = parseISO(latestDate)
  const pastMonths = [2, 1].map((back) => {
    const monthStart = startOfMonth(subMonths(date, back))
    return {
      start: toDateText(monthStart),
      end: toDateText(endOfMonth(monthStart)),
    }
  })
  return [
    ...pastMonths,
    { start: toDateText(startOfMonth(date)), end: latestDate },
  ]
}

// { start, end } → 한 달이 다 찼으면 '9월', 아니면 '10월 (1~7일)'
export function formatMonthLabel({ start, end }) {
  const month = Number(start.split('-')[1])
  // 1일부터 말일까지 다 찼으면 달 이름만 (결정 3)
  if (end === toDateText(endOfMonth(parseISO(start)))) return `${month}월`
  const startDay = Number(start.split('-')[2])
  const endDay = Number(end.split('-')[2])
  if (start === end) return `${month}월 (${startDay}일)`
  return `${month}월 (${startDay}~${endDay}일)`
}

// ---- 원본 데이터 요일 필터 (이슈 #32) ----

// 버튼 순서 (월요일 먼저). value 는 getDay() 번호: 일 = 0 … 토 = 6
export const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((value) => ({
  value,
  label: WEEKDAY_NAMES[value],
}))

// 켜고 끄기 (월요일 먼저 순서). 다 끄거나 7개 다 켜면 [] = 전체
export function toggleWeekday(weekdays, day) {
  const next = weekdays.includes(day)
    ? weekdays.filter((value) => value !== day)
    : [...weekdays, day]
  // 7개 다 켜면 전체와 같은 뜻 (결정 2)
  if (next.length === WEEKDAY_OPTIONS.length) return []
  return WEEKDAY_OPTIONS.map((option) => option.value).filter((value) =>
    next.includes(value),
  )
}

// 'YYYY-MM-DD' → getDay() 번호. weekdays 가 [] 이면 모든 요일 (결정 1)
export function matchesWeekdays(date, weekdays) {
  return weekdays.length === 0 || weekdays.includes(parseISO(date).getDay())
}

// [6, 0] → '토일', [] → ''
export function formatWeekdays(weekdays) {
  return WEEKDAY_OPTIONS.filter((option) => weekdays.includes(option.value))
    .map((option) => option.label)
    .join('')
}

// ---- 일자별 추이 (이슈 #12) ----

// 기준일을 포함한 14일 (오래된 날 먼저)
export function getLast14Days(latestDate) {
  return Array.from({ length: 14 }, (_, index) =>
    daysBefore(latestDate, 13 - index),
  )
}
