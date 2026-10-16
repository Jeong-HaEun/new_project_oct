import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createReportStore } from './report-store.js'

function fakeClient(pages) {
  const ranges = []
  const client = {
    from(name) {
      assert.equal(name, 'reports')
      return this
    },
    select() {
      return this
    },
    order() {
      return this
    },
    async range(start, end) {
      ranges.push([start, end])
      return pages.shift()
    },
  }
  return { client, ranges }
}

test('1,000행을 초과한 보고서도 마지막 페이지까지 조회한다', async () => {
  const { client, ranges } = fakeClient([
    { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null },
    {
      data: Array.from({ length: 500 }, (_, id) => ({ id: id + 500 })),
      error: null,
    },
    { data: [{ id: 1000 }], error: null },
  ])
  const rows = await createReportStore(client).fetchReports()
  assert.equal(rows.length, 1001)
  assert.equal(rows.at(-1).id, 1000)
  assert.deepEqual(ranges, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ])
})

test('중간 페이지 실패를 부분 데이터 성공으로 표시하지 않는다', async () => {
  const { client } = fakeClient([
    { data: Array(500).fill({ id: 1 }), error: null },
    { data: null, error: { message: 'denied' } },
  ])
  await assert.rejects(createReportStore(client).fetchReports(), /불러오지 못/)
})

test('CSV 전체를 RPC 한 번에 보내고 생성·수정 결과를 유지한다', async () => {
  const rows = [{ reportDate: '2026-10-01' }]
  let calls = 0
  const store = createReportStore({
    async rpc(name, args) {
      calls++
      assert.equal(name, 'bulk_upsert_reports')
      assert.deepEqual(args, { rows })
      return { data: { created: 1, updated: 0 }, error: null }
    },
  })
  assert.deepEqual(await store.uploadReports(rows), { created: 1, updated: 0 })
  assert.equal(calls, 1)
})

test('RPC 실패를 성공 결과로 반환하지 않는다', async () => {
  const store = createReportStore({
    async rpc() {
      return { data: null, error: { code: '42501' } }
    },
  })
  await assert.rejects(store.uploadReports([]), /저장되지 않았/)
})
