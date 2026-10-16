import { supabase } from './supabase.js'
import { createReportStore } from './report-store.js'

function getStore() {
  if (!supabase) throw new Error('Supabase 연결 설정이 필요해요.')
  return createReportStore(supabase)
}

export function fetchReports() {
  return getStore().fetchReports()
}

export function uploadReports(rows) {
  return getStore().uploadReports(rows)
}
