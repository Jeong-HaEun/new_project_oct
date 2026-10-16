# Supabase 데이터 계약

기존 `/api/reports` 서버 호출은 `src/api/reports.js`에서 Supabase 어댑터로 교체했습니다.

- `fetchReports()`: 로그인 계정의 `public.reports`를 날짜 내림차순, ID 오름차순으로 500줄씩 조회.
- `uploadReports(rows)`: `bulk_upsert_reports(rows jsonb)` RPC를 한 번 호출, `{ created, updated }` 반환.
- 필드: `id, reportDate, media, campaignName, adGroupName, creativeName, cost, impressions, clicks, carts, conversions, revenue`.
- 이름 1~100자, 매체 NAVER/META/GOOGLE, 날짜 YYYY-MM-DD, 숫자는 0 이상 JavaScript 안전 정수 범위.
- 중복 키: 계정 + 날짜 + 매체 + 캠페인 + 광고그룹 + 소재. 동일 파일의 중복도 입력 순서로 처리하므로 마지막 줄이 남습니다.
- 잘못된 행이 하나라도 있으면 전체 업로드를 롤백합니다. 최대 10,000줄.
- 인증: Supabase 이메일·비밀번호 세션. 요청은 공개 키와 로그인 JWT를 사용하며 RLS가 계정별 접근을 제한합니다.
- 설정: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. 비공개 키는 금지.
- 단건 작업은 Supabase 테이블 API와 RLS가 지원하지만 기존 REST URL을 호환하는 별도 서버는 제공하지 않습니다.
