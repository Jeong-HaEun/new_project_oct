// 매체 필터 알약 (design.md 5-4). media 가 null 이면 "전체" 가 골라진 상태.
import { MEDIA_LIST } from '../utils/media.js'

// 알약 버튼 공통 모양 (design.md 5-4). 기간 빠른 버튼도 같이 쓴다. 고른 것은 aria-pressed
export const PILL_CLASSES =
  'h-9 whitespace-nowrap rounded-full border border-hairline bg-surface px-3 text-sm text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-primary-tint aria-pressed:bg-primary-tint aria-pressed:font-semibold aria-pressed:text-primary-strong md:px-4'

const OPTIONS = [{ value: null, label: '전체' }].concat(
  MEDIA_LIST.map((media) => ({ value: media, label: media })),
)

// disabled: 데이터 0건이면 누를 수 없게 (design.md 5-4 비활성)
export function MediaFilter({ media, onChange, disabled = false }) {
  return (
    <div
      role="group"
      aria-label="매체 필터"
      className="mt-6 flex gap-2 md:mt-8"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          aria-pressed={media === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={PILL_CLASSES}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
