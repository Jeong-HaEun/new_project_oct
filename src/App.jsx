// 최상위 컴포넌트: 처음 열릴 때 전체 데이터를 한 번 불러오고, 주소에 맞는 페이지를 보여 준다 (PRD ADR-1 · ADR-2).
import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { fetchReports } from './api/reports.js'
import { CsvUploadButton } from './components/CsvUploadButton.jsx'
import { ErrorState } from './components/ErrorState.jsx'
import { LoadingState } from './components/LoadingState.jsx'
import { PageNav } from './components/PageNav.jsx'
import { UploadMessage } from './components/UploadMessage.jsx'
import { DataPage } from './pages/DataPage.jsx'
import { SummaryPage } from './pages/SummaryPage.jsx'
import { buildTemplateCsv, TEMPLATE_FILE_NAME } from './utils/csv.js'
import { downloadText } from './utils/download.js'

export function App() {
  const [rows, setRows] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)

  function loadReports() {
    fetchReports()
      .then((nextRows) => {
        setRows(nextRows)
        setErrorMessage(null)
      })
      .catch((error) => setErrorMessage(error.message))
  }

  useEffect(() => {
    loadReports()
  }, [])

  // 업로드용 빈 양식 (머리글은 데이터가 없거나 오류여도 항상 보인다)
  function handleTemplateDownload() {
    downloadText(TEMPLATE_FILE_NAME, buildTemplateCsv())
  }

  // 저장에 성공하면 전체를 한 번 다시 받는다 (PRD ADR-2)
  function handleUploadResult(result) {
    setUploadResult(result)
    if (result.type === 'success') loadReports()
  }

  function handleRetry() {
    setErrorMessage(null)
    setRows(null)
    loadReports()
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-hairline bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3.5 py-3 md:px-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
              Adporter
            </h1>
            <p className="text-xs text-muted">광고 성과 보고서</p>
          </div>
          <div className="flex gap-2">
            {/* 휴대폰은 머리글이 좁아 글자를 줄인다. 읽기 프로그램에는 전체 이름 */}
            <button
              type="button"
              onClick={handleTemplateDownload}
              aria-label="양식 내려받기"
              className="h-11 whitespace-nowrap rounded border border-hairline bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:bg-primary-tint"
            >
              <span className="md:hidden">양식</span>
              <span className="hidden md:inline">양식 내려받기</span>
            </button>
            <CsvUploadButton onResult={handleUploadResult} />
          </div>
        </div>
        {/* 휴대폰 머리글이 좁아 페이지 이동은 둘째 줄 */}
        <div className="mx-auto max-w-6xl px-3.5 pb-3 md:px-6">
          <PageNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3.5 pb-12 md:px-6">
        {uploadResult && <UploadMessage result={uploadResult} />}
        {errorMessage !== null ? (
          <ErrorState message={errorMessage} onRetry={handleRetry} />
        ) : rows === null ? (
          <LoadingState />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <SummaryPage
                  rows={rows}
                  onTemplateDownload={handleTemplateDownload}
                  onUploadResult={handleUploadResult}
                />
              }
            />
            <Route path="/data" element={<DataPage rows={rows} />} />
          </Routes>
        )}
      </main>
    </>
  )
}
