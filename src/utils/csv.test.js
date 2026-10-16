import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CSV_COLUMNS, TEMPLATE_FILE_NAME, buildTemplateCsv } from './csv.js'

const BOM = '﻿'
const HEADER =
  '날짜,매체,캠페인,광고그룹,소재,광고비,노출,클릭,장바구니,전환,매출'

test('S1 [정상] 맨 앞 글자는 BOM', () => {
  assert.equal(buildTemplateCsv()[0], BOM)
})

test('S2 [정상] BOM 다음 첫 줄은 제목 줄', () => {
  const firstLine = buildTemplateCsv().slice(1).split('\r\n')[0]
  assert.equal(firstLine, HEADER)
})

test('S3 [경계] 전체 내용은 BOM + 제목 줄 + 줄바꿈 1번 (예시 줄 0개)', () => {
  assert.equal(buildTemplateCsv(), `${BOM}${HEADER}\r\n`)
})

test('S4 [경계] 칸은 정확히 11개', () => {
  assert.equal(CSV_COLUMNS.length, 11)
})

test('S5 [정상] 필드는 api.md JSON 순서 (id 제외)', () => {
  assert.deepEqual(
    CSV_COLUMNS.map((column) => column.field),
    [
      'reportDate',
      'media',
      'campaignName',
      'adGroupName',
      'creativeName',
      'cost',
      'impressions',
      'clicks',
      'carts',
      'conversions',
      'revenue',
    ],
  )
})

test("S6 [정상] 파일 이름은 'adporter_양식.csv'", () => {
  assert.equal(TEMPLATE_FILE_NAME, 'adporter_양식.csv')
})
