// [CSV 업로드] 주요 버튼 (design.md 5-3, 처리 중 = "올리는 중…" + disabled)
// 파일 읽기 → 검사 → 서버 저장 순서로 utils · api 함수를 부르기만 한다.
import { useRef, useState } from 'react'
import { uploadReports } from '../api/reports.js'
import { decodeCsv, formatUploadResult, parseReportCsv } from '../utils/csv.js'

export function CsvUploadButton({ onResult }) {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  function handleClick() {
    inputRef.current.click()
  }

  async function handleFileChange(event) {
    const file = event.target.files[0]
    // 같은 파일을 다시 골라도 change 가 일어나게 비워 둔다
    event.target.value = ''
    if (!file) return

    setIsUploading(true)
    try {
      const { rows, errors } = parseReportCsv(
        decodeCsv(await file.arrayBuffer()),
      )
      if (errors.length > 0) {
        onResult({ type: 'invalid', errors })
        return
      }
      const result = await uploadReports(rows)
      onResult({ type: 'success', message: formatUploadResult(result) })
    } catch (error) {
      onResult({ type: 'error', message: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="h-11 whitespace-nowrap rounded bg-primary-strong px-4 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isUploading ? '올리는 중…' : 'CSV 업로드'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  )
}
