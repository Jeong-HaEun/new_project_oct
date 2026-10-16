// 페이지 이동 [요약] [원본 데이터] (design.md 5-9). 고른 매체(?media=)를 들고 간다.
import { NavLink, useLocation } from 'react-router'

const PAGES = [
  { to: '/', label: '요약' },
  { to: '/data', label: '원본 데이터' },
]

// 알약 모양 (5-4 와 같음), 지금 페이지는 aria-current="page" 로 표시
const NAV_CLASSES =
  'inline-flex h-9 items-center whitespace-nowrap rounded-full border border-hairline bg-surface px-3 text-sm text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong aria-[current=page]:border-primary-tint aria-[current=page]:bg-primary-tint aria-[current=page]:font-semibold aria-[current=page]:text-primary-strong md:px-4'

export function PageNav() {
  const { search } = useLocation()

  return (
    <nav aria-label="페이지" className="flex gap-2">
      {PAGES.map((page) => (
        <NavLink
          key={page.to}
          to={{ pathname: page.to, search }}
          end
          className={NAV_CLASSES}
        >
          {page.label}
        </NavLink>
      ))}
    </nav>
  )
}
