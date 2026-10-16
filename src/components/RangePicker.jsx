// 기간 고르기: 빠른 버튼(5-4 알약) + 시작일 · 끝일 칸(design.md 5-10).
// preset 이 null 이면 날짜를 직접 고른 상태 (빠른 버튼은 아무것도 안 골라짐).
import { RANGE_PRESETS } from '../utils/dates.js'
import { PILL_CLASSES } from './MediaFilter.jsx'

const DATE_INPUT =
  'h-11 rounded border border-hairline bg-surface px-3 text-sm text-ink tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong'

export function RangePicker({ preset, range, onPresetChange, onRangeChange }) {
  return (
    <div className="mt-4">
      <div
        role="group"
        aria-label="기간 빠른 선택"
        className="flex flex-wrap gap-2"
      >
        {RANGE_PRESETS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={preset === option.key}
            onClick={() => onPresetChange(option.key)}
            className={PILL_CLASSES}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          시작일
          <input
            type="date"
            value={range.start}
            onChange={(event) =>
              onRangeChange({ ...range, start: event.target.value })
            }
            className={DATE_INPUT}
          />
        </label>
        <span aria-hidden="true" className="text-muted">
          ~
        </span>
        <label className="flex items-center gap-2 text-xs text-muted">
          끝일
          <input
            type="date"
            value={range.end}
            onChange={(event) =>
              onRangeChange({ ...range, end: event.target.value })
            }
            className={DATE_INPUT}
          />
        </label>
      </div>
    </div>
  )
}
