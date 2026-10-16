// 원본 데이터 페이지 (/data). 고른 매체 · 기간의 원본 줄을 표로 보고 같은 줄을 내려받는다.
// 매체는 주소(?media=), 기간 · 요일은 화면 상태(useState) (prd "원본 데이터 페이지", 이슈 #32).
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { MediaFilter } from '../components/MediaFilter.jsx'
import { RangePicker } from '../components/RangePicker.jsx'
import { RawDataTable } from '../components/RawDataTable.jsx'
import { WeekdayFilter } from '../components/WeekdayFilter.jsx'
import {
  buildDownloadFileName,
  buildReportsCsv,
  selectRows,
} from '../utils/csv.js'
import {
  formatRangeLabel,
  formatWeekdays,
  getLatestDate,
  getPresetRange,
  toggleWeekday,
  validateRange,
} from '../utils/dates.js'
import { downloadText } from '../utils/download.js'
import { parseMedia } from '../utils/media.js'

const FIRST_PRESET = 'last98'

export function DataPage({ rows }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const media = parseMedia(searchParams.get('media'))
  const latestDate = getLatestDate(rows)

  const [preset, setPreset] = useState(FIRST_PRESET)
  const [range, setRange] = useState(() =>
    latestDate === null
      ? { start: '', end: '' }
      : getPresetRange(FIRST_PRESET, latestDate),
  )
  // [] = 모든 요일 (issue-32-tests.md 결정 1)
  const [weekdays, setWeekdays] = useState([])

  // 전체를 고르면 주소에서 media 를 뺀다 (요약 페이지와 같은 규칙)
  function handleMediaChange(nextMedia) {
    setSearchParams(nextMedia === null ? {} : { media: nextMedia })
  }

  function handlePresetChange(nextPreset) {
    setPreset(nextPreset)
    setRange(getPresetRange(nextPreset, latestDate))
  }

  // 날짜를 직접 고르면 빠른 버튼은 아무것도 안 골라진 상태
  function handleRangeChange(nextRange) {
    setPreset(null)
    setRange(nextRange)
  }

  function handleWeekdayToggle(day) {
    setWeekdays((previous) => toggleWeekday(previous, day))
  }

  function handleWeekdayReset() {
    setWeekdays([])
  }

  if (latestDate === null) {
    return <p className="mt-6 text-sm text-ink md:mt-8">아직 데이터가 없어요</p>
  }

  const rangeError = validateRange(range)
  const selectedRows = rangeError
    ? []
    : selectRows(rows, media, range, weekdays)
  // '전체 · 토일 · 7/2~10/7' (요일 전체면 요일 글자는 빠짐)
  const scopeLabel = [
    media ?? '전체',
    formatWeekdays(weekdays),
    formatRangeLabel(range),
  ]
    .filter(Boolean)
    .join(' · ')

  function handleDownload() {
    downloadText(
      buildDownloadFileName(media, range, weekdays),
      buildReportsCsv(selectedRows),
    )
  }

  return (
    <>
      <MediaFilter media={media} onChange={handleMediaChange} />
      <RangePicker
        preset={preset}
        range={range}
        onPresetChange={handlePresetChange}
        onRangeChange={handleRangeChange}
      />
      <WeekdayFilter
        weekdays={weekdays}
        onToggle={handleWeekdayToggle}
        onReset={handleWeekdayReset}
      />
      {rangeError ? (
        <p role="alert" className="mt-4 text-sm text-bad">
          {rangeError}
        </p>
      ) : (
        <section aria-label="원본 데이터" className="mt-6 md:mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              {scopeLabel} · {selectedRows.length}줄
            </p>
            {selectedRows.length > 0 && (
              <button
                type="button"
                onClick={handleDownload}
                className="h-11 whitespace-nowrap rounded border border-hairline bg-surface px-4 text-sm font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:bg-primary-tint"
              >
                {scopeLabel} 내려받기
              </button>
            )}
          </div>
          {selectedRows.length > 0 ? (
            <RawDataTable rows={selectedRows} />
          ) : (
            <p className="mt-3 text-sm text-ink">
              {weekdays.length > 0
                ? '이 기간 · 요일에 데이터가 없어요'
                : '이 기간에 데이터가 없어요'}
            </p>
          )}
        </section>
      )}
    </>
  )
}
