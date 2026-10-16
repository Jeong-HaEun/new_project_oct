# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 일할 때 매번 먼저 읽는 안내서다. **200줄 이하로 유지**하고, 긴 내용은 `docs/` 로 옮긴 뒤 여기서 가리킨다.

# Adporter · 광고 성과 보고서 (프론트엔드)

그로스 마케팅 포트폴리오용 웹페이지. 매체별 광고 성과 원본 데이터를 받아, 지표(CTR·ROAS 등)를 화면에서 계산해 보여준다.
현재 상태: 기존 보고서 UI를 유지하고 Supabase 인증·데이터 저장 및 GitHub Pages 배포로 전환함.

## 사용자와 일하는 규칙

- 사용자는 개발 초보자다. **단계별로, 쉬운 한국어로** 설명하고, 새 용어는 한 줄로 풀어 쓴다.
- ⚠️ **모든 답변과 작업 중 안내 문장은 한국어로만 쓴다.**
- 단계마다 "무엇을 / 왜 / 어떻게 확인하는지"를 알려준다. 한 번에 파일을 많이 만들지 않는다.
- 사용자가 직접 할 일(가입, 클릭 등)은 번호 매긴 순서로 안내한다.
- ⚠️ **실행 전에 반드시 확인받는다.** 파일 생성·수정, 패키지 설치, 커밋 모두. 계획을 먼저 설명하고 승인 후 진행.
- **추천할 때는 반드시 이유를 함께 말한다.**

## 기술 스택

- React 19 + Vite 8 (JavaScript, TypeScript 아님)
- 린트: ESLint (`eslint.config.js`) · 모양 정리: Prettier (`.prettierrc`)
- 디자인: Tailwind 4 · 규칙 `docs/design/design.md` (스킬 `design-rules`, 파일 수정 후 훅이 금지 목록 자동 검사)
- 커밋 검문소: husky + lint-staged + commitlint — 메시지 형식 `타입(범위): 설명` (feat·fix·test·refactor·chore·docs)
- 테스트: Node 내장 `node --test` (설치 불필요, `*.test.js`) — 아직 테스트 없음

## 명령어

```bash
npm install                 # 처음 한 번, 패키지 설치
npm run dev                 # 개발 서버 http://localhost:5173 (저장하면 자동 새로고침)
npm run build               # 배포용 빌드 → dist/
npm run preview             # 빌드 결과를 로컬에서 확인
npm run lint                # ESLint 검사
node --test                 # 전체 테스트 (*.test.js)
node --test src/utils/metrics.test.js   # 파일 하나만
```

작업을 마치면 `npm run lint` 와 `npm run build` 가 통과하는지 확인한다.

## 파일 구조

```
index.html          진입 HTML
vite.config.js      Vite 설정
public/             그대로 복사되는 파일 (아이콘 등)
src/
  main.jsx          React 시작점 (App 을 화면에 붙임)
  App.jsx           최상위 컴포넌트: 데이터 불러오기·라우팅
  index.css         전역 스타일, 색·글꼴 변수(:root)
  App.css           부분별 모양
  pages/            페이지 단위 컴포넌트 (필터 상태 보관)        ← 만들 예정
  components/       화면 조각 (props 로 받아 그리기만)           ← 만들 예정
  utils/            순수 함수 + *.test.js (metrics.js 등)       ← 만들 예정
  api/              서버 호출 (reports.js 한 곳)               ← 만들 예정
docs/               자세한 규칙 문서
```

## 코딩 규칙

- 컴포넌트: 함수형, `.jsx`, 파일명 PascalCase (`SummaryCard.jsx`).
- ⚠️ **named export 사용**: `export function SummaryCard() {}` / `import { SummaryCard } from './SummaryCard'`. `export default` 쓰지 않는다.
  - 이유: 이름이 파일과 항상 같아져서 검색·자동 import 가 정확하다.
- ⚠️ **이벤트 처리 함수는 `handle` 로 시작**: `handleClick`, `handleSubmit`, `handleMediaChange`.
  - props 로 넘길 때 이름은 `on` 으로 시작: `<Filter onChange={handleMediaChange} />`
- 계산은 컴포넌트에 쓰지 않고 `src/utils/metrics.js` 를 호출한다.
- 서버 호출은 `src/api/` 에만 둔다. 실패 시 `Error` 를 던지고, 화면은 `.catch` 로 메시지를 보여준다.
- 상태 관리: React `useState` 만 (별도 라이브러리 없음).
- 코드 스타일: 들여쓰기 2칸, 작은따옴표, 세미콜론 없음.

### 네이밍

| 위치                    | 규칙            | 예                        |
| ----------------------- | --------------- | ------------------------- |
| JS 변수·함수, JSON 필드 | camelCase       | `adGroupName`             |
| React 컴포넌트·파일     | PascalCase      | `CampaignTable.jsx`       |
| 이벤트 처리 함수        | `handle` + 동작 | `handleUpload`            |
| 매체 값                 | 대문자          | `NAVER`, `META`, `GOOGLE` |

## 계산 지표 — 요약 (자세히: `docs/metrics.md`)

| 지표                  | 공식                | 표시      |
| --------------------- | ------------------- | --------- |
| CTR                   | 클릭 ÷ 노출         | `2.35%`   |
| CPC                   | 광고비 ÷ 클릭       | `1,234원` |
| CPB (Cost Per Basket) | 광고비 ÷ 장바구니수 | `1,234원` |
| CPA                   | 광고비 ÷ 전환       | `1,234원` |
| ROAS                  | 매출 ÷ 광고비       | `350%`    |

- ⚠️ **분모가 0이면 `-`** 를 표시한다 (`NaN`·`Infinity` 노출 금지).
- ⚠️ **합계 지표는 합계끼리 나눈다.** 전체 ROAS = 총 매출 ÷ 총 광고비 (행별 ROAS 의 평균 아님). 일별·월별도 같다.
- 지표는 DB에 저장하지 않고 화면에서 계산한다. 계산 함수는 `src/utils/metrics.js` 한 곳에 모은다.

## API — 요약 (자세히: `docs/api.md`)

- Supabase 테이블 조회 및 `bulk_upsert_reports` RPC. 기존 HTTP 서버 경로는 사용하지 않는다.
- 연결은 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`로 설정한다. 상세 계약은 `docs/api.md`와 README를 따른다.
- ⚠️ **JSON 필드는 camelCase**: `id, reportDate, media, campaignName, adGroupName, creativeName, cost, impressions, clicks, carts, conversions, revenue`
- 날짜 형식: `"2026-10-01"`

## 비밀값 / 환경변수

- ⚠️ **코드에 비밀번호·키·접속 정보를 직접 쓰지 않는다.** 환경변수로만 받는다.
- `.env` 는 git 에서 제외(`.gitignore`), 변수 이름만 적은 `.env.example` 만 커밋한다.
- Vite 는 `VITE_` 로 시작하는 변수만 화면 코드에 전달한다 → **브라우저에 공개되므로 비밀값을 `VITE_` 변수에 넣지 않는다.**
