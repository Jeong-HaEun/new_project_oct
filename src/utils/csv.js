// CSV 양식 함수 모음. 제목 줄 이름은 test1007 샘플 CSV 와 같다.
import Papa from 'papaparse'
import { filterByDateRange, formatWeekdays, matchesWeekdays } from './dates.js'
import { filterByMedia, parseMedia } from './media.js'

// CSV 제목 ↔ JSON 필드 짝 (api.md 순서, id 제외). 파일에는 '전환', 화면에서만 "구매"
export const CSV_COLUMNS = [
  { header: '날짜', field: 'reportDate' },
  { header: '매체', field: 'media' },
  { header: '캠페인', field: 'campaignName' },
  { header: '광고그룹', field: 'adGroupName' },
  { header: '소재', field: 'creativeName' },
  { header: '광고비', field: 'cost' },
  { header: '노출', field: 'impressions' },
  { header: '클릭', field: 'clicks' },
  { header: '장바구니', field: 'carts' },
  { header: '전환', field: 'conversions' },
  { header: '매출', field: 'revenue' },
]

export const TEMPLATE_FILE_NAME = 'adporter_양식.csv'

// 엑셀이 UTF-8 한글로 읽게 하는 표시 (보이지 않는 글자라 코드로 만든다), CSV 표준 줄바꿈
const BOM = String.fromCharCode(0xfeff)
const LINE_BREAK = '\r\n'

// BOM + 제목 줄 1줄 (예시 줄 없음)
export function buildTemplateCsv() {
  const header = CSV_COLUMNS.map((column) => column.header).join(',')
  return `${BOM}${header}${LINE_BREAK}`
}

// ---- CSV 업로드 (이슈 #10) ----

// UTF-8 로 읽어 보고, 깨지면 EUC-KR(엑셀 기본)로 다시 읽는다
export function decodeCsv(buffer) {
  try {
    // fatal: 깨진 글자를 만나면 오류를 내게 해서 EUC-KR 로 넘어간다
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('euc-kr').decode(buffer)
  }
}

// '2026/10/1' · '2026. 10. 1.' → '2026-10-01'. 없는 날짜는 null
export function normalizeDate(value) {
  const match = value
    .trim()
    .match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\.?$/)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  // 2월 29일 · 13월처럼 없는 날짜는 Date 가 다음 달로 넘겨 버리므로 되돌려 확인한다
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// '100,000' → 100000. 0 이상 정수가 아니면 null
export function normalizeNumber(value) {
  const cleaned = value.trim().replaceAll(',', '')
  if (!/^\d+$/.test(cleaned)) return null
  return Number(cleaned)
}

// CSV 글자 → { rows, errors }. errors 가 하나라도 있으면 서버로 보내지 않는다
const TEXT_FIELDS = ['campaignName', 'adGroupName', 'creativeName']
const MAX_NAME_LENGTH = 100

// 칸 하나를 검사해 { value, error } 로 돌려준다 (오류 문구: issue-10-tests.md 결정 1)
function readCell(field, header, raw) {
  if (field === 'reportDate') {
    const value = normalizeDate(raw)
    return {
      value,
      error: value ? null : `${header} 칸은 2026-10-01 모양이어야 해요`,
    }
  }
  if (field === 'media') {
    const value = parseMedia(raw)
    return {
      value,
      error: value
        ? null
        : `${header} 칸은 NAVER · META · GOOGLE 중 하나여야 해요`,
    }
  }
  if (TEXT_FIELDS.includes(field)) {
    if (raw === '') return { value: raw, error: `${header} 칸이 비어 있어요` }
    if (raw.length > MAX_NAME_LENGTH) {
      return {
        value: raw,
        error: `${header} 칸은 ${MAX_NAME_LENGTH}자 이하여야 해요`,
      }
    }
    return { value: raw, error: null }
  }
  const value = normalizeNumber(raw)
  return {
    value,
    error: value === null ? `${header} 칸은 0 이상의 숫자여야 해요` : null,
  }
}

function isBlankRecord(record) {
  return Object.values(record).every((value) => (value ?? '').trim() === '')
}

export function parseReportCsv(text) {
  const body = text.startsWith(BOM) ? text.slice(1) : text
  const { data, meta } = Papa.parse(body, {
    header: true,
    transformHeader: (header) => header.trim(),
  })

  const missing = CSV_COLUMNS.filter(
    (column) => !meta.fields.includes(column.header),
  )
  if (missing.length > 0) {
    const names = missing.map((column) => column.header).join(', ')
    return { rows: [], errors: [`필요한 칸이 없어요: ${names}`] }
  }

  const rows = []
  const errors = []
  data.forEach((record, index) => {
    // 빈 줄은 건너뛰되, 줄 번호는 엑셀과 같게 센다 (제목 줄 = 1)
    if (isBlankRecord(record)) return
    const line = index + 2
    const row = {}
    for (const { header, field } of CSV_COLUMNS) {
      const { value, error } = readCell(
        field,
        header,
        (record[header] ?? '').trim(),
      )
      row[field] = value
      if (error) errors.push(`${line}번째 줄: ${error}`)
    }
    rows.push(row)
  })

  if (rows.length === 0) return { rows: [], errors: ['데이터 줄이 없어요'] }
  return { rows, errors }
}

// { created, updated } → '새로 3줄 · 바뀐 2줄'
export function formatUploadResult({ created, updated }) {
  return `새로 ${created}줄 · 바뀐 ${updated}줄`
}

// ---- 원본 데이터 표 · 내려받기 (이슈 #15 · #19) ----

// 매체 필터 + 고른 기간 + 고른 요일([] = 전체, 이슈 #32) + 날짜 오래된 순 (표 · 내려받기 공통)
export function selectRows(rows, media, { start, end }, weekdays = []) {
  // sort 는 같은 날짜끼리 받은 순서를 지킨다
  return filterByDateRange(filterByMedia(rows, media), start, end)
    .filter((row) => matchesWeekdays(row.reportDate, weekdays))
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
}

// 쉼표 · 따옴표 · 줄바꿈이 든 칸은 따옴표로 감싸고, 따옴표는 두 번 쓴다
function toCsvCell(value) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

// BOM + 제목 줄 + 원본 줄 (양식과 같은 칸). 다시 올릴 수 있어야 한다
export function buildReportsCsv(rows) {
  const header = CSV_COLUMNS.map((column) => column.header).join(',')
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((column) => toCsvCell(row[column.field])).join(','),
  )
  return BOM + [header, ...lines].map((line) => line + LINE_BREAK).join('')
}

// 'adporter_META_2026-07-02_2026-10-07.csv' (전체면 '전체'). 요일을 고르면 매체 뒤에: 'adporter_전체_토일_…'
export function buildDownloadFileName(media, { start, end }, weekdays = []) {
  const parts = [media ?? '전체', formatWeekdays(weekdays), start, end]
  return `adporter_${parts.filter(Boolean).join('_')}.csv`
}
