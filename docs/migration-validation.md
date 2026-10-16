# 전환 검증 기록

원본: Jeong-HaEun/project_oct, HEAD `189707e3b2a73217bdb94303bd56823446c4ea50`.
전환본: `/workspace/new_project_oct`. 원본 체크아웃의 파일 변경 없음.

## 통과

- Node 24에서 `npm ci`로 잠금 파일 설치 재현.
- `npm test`: 324개 통과, 실패·스킵 0. 기존 지표·CSV·필터 테스트와 Supabase 어댑터 테스트 포함.
- `npm run lint`, `npm run build` 통과.
- 공개 연결 정보를 넣은 빌드 통과. 비공개 `sb_secret_` 키를 넣은 빌드는 의도대로 차단.
- PostgreSQL 17 일회용 컨테이너에서 `supabase/tests/reports.sql` 통과: SQL 반복 적용, 생성/수정 건수, 파일 내 중복의 마지막 값 유지, 오류 시 부분 저장 취소, 음수/소수/잘못된 날짜/안전 정수 초과 거부, 계정 간 조회·수정 차단, 소유자 변경 차단, 익명 조회·업로드 차단.
- Chromium에서 프로덕션 빌드를 `/new_project_oct/` 하위 경로로 제공하여 확인: 로그인, 요약, META 필터, 원본 데이터 이동, 주소 유지 후 새로고침, CSV 업로드, CSV 다운로드, 390px 모바일에서 페이지 가로 넘침 없음, 로그아웃 시 보고서 제거. JavaScript 런타임 오류 없음.

브라우저 검증은 Supabase Auth/Data API 응답을 모사했다. SQL 검증은 Supabase `auth.uid()`와 DB 역할을 모사한 로컬 PostgreSQL에서 실행했다. 실제 Supabase 인증 서버와의 통합 검증을 대신하지 않는다.

## 남은 실제 서비스 확인

1. Supabase 프로젝트 생성, 마이그레이션 적용, 로그인 계정 등록.
2. 공개 URL/publishable 키 설정 후 실제 로그인·CSV 저장·새로고침·다른 계정 격리 확인.
3. 대상 GitHub 저장소에 소스 등록 및 Pages/Actions 변수 설정 후 배포.
4. 게시된 주소에서 로그인·CSV·필터·새로고침 재확인.

현재 `new_project_oct` GitHub 원격은 접근할 수 없었다(Repository not found). 저장소가 없거나 접근 권한이 없을 수 있다. 원격 생성·push·Pages 게시는 수행하지 않았다.
Supabase 환경변수는 이 실행 환경에 없으므로 실제 프로젝트 데이터는 변경하지 않았다.

설정이 있는 빌드는 큰 청크 경고가 있지만 빌드는 성공했다. 차트 라이브러리와 SDK가 포함된 번들로, 이후 로딩 최적화 여지는 있다.
