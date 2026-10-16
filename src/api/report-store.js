// 기본 1,000행 제한으로 보고서가 잘리지 않도록 명시적으로 페이지를 순회한다.
export function createReportStore(client) {
  return {
    async fetchReports() {
      const rows = []
      const pageSize = 500
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await client
          .from('reports')
          .select(
            'id,reportDate,media,campaignName,adGroupName,creativeName,cost,impressions,clicks,carts,conversions,revenue',
          )
          .order('reportDate', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error)
          throw new Error(
            '데이터를 불러오지 못했어요. 로그인 상태와 Supabase 설정을 확인해 주세요.',
          )
        rows.push(...data)
        if (data.length < pageSize) return rows
      }
    },
    async uploadReports(rows) {
      // 여러 요청으로 나누면 중간 실패 때 일부만 저장되므로 RPC 한 번으로 처리한다.
      const { data, error } = await client.rpc('bulk_upsert_reports', { rows })
      if (error) {
        throw new Error(
          '업로드하지 못했어요. 로그인 상태, CSV 값, 10,000줄 제한을 확인해 주세요. 이번 업로드는 저장되지 않았어요.',
        )
      }
      return data
    },
  }
}
