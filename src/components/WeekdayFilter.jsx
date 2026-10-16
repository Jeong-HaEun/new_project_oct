// 요일 필터 알약 (design.md 5-4). 여러 개 고를 수 있고, weekdays 가 [] 이면 "전체" 가 골라진 상태.
import { WEEKDAY_OPTIONS } from '../utils/dates.js'
import { PILL_CLASSES } from './MediaFilter.jsx'

// onToggle(day): 요일 하나 켜고 끄기 · onReset(): 전체로
export function WeekdayFilter({ weekdays, onToggle, onReset }) {
  return (
    <div
      role="group"
      aria-label="요일 필터"
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <span className="text-xs text-muted">요일</span>
      <button
        type="button"
        aria-pressed={weekdays.length === 0}
        onClick={onReset}
        className={PILL_CLASSES}
      >
        전체
      </button>
      {WEEKDAY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={weekdays.includes(option.value)}
          onClick={() => onToggle(option.value)}
          className={PILL_CLASSES}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
