# 클로드 인계: Adporter 성과 요약 코멘트

## 작업 위치와 상태

- 저장소: `C:\Users\dodo7\Desktop\new_project_oct`
- 브랜치: `codex/gemini-report-comment`
- 이 문서 작성 시 기능 변경은 미커밋 상태다. 시작할 때 `git status`와 현재 브랜치를 재확인한다.
- `new_project_1021` 등 다른 저장소는 이 작업에서 수정하지 않았다. main 병합·push·GitHub Pages 배포는 하지 않았다. 기존 배포 워크플로는 main push 시 실행되므로 승인 없이 push하지 않는다.
- 사용자가 Supabase SQL·Secret·report-comment 함수 배포를 직접 수행했고 실제 Gemini 코멘트 생성을 확인했다. Codex가 라이브 Supabase 설정·DB 정책을 독립적으로 조회한 것은 아니다.

## 최종 구현

- SummaryPage 상단의 ReportComment: 전일·전주 동요일 기본 비교 + Gemini 짧은 분석.
- CSV 분석 입력 변경 시 자동 요청. 같은 입력·계정·모델·지침은 서버의 완성 코멘트를 재사용한다. 하루가 지나도 입력이 같으면 다시 생성하지 않는다.
- 업종·상품·수요 시기·선택적 대표 지역과 날씨, 운영 메모를 '설정 저장 후 분석'으로 적용한다. 설정은 계정별 같은 브라우저에만 보관한다.
- 최대 대기 시간은 150초(2분 30초), 새 기본값 150초. 기존 선택은 유지한다. 상태·시간 막대는 실제 모델 진행률이 아닌 대기 시간 표시다.
- 서버는 무료 실행 제한에 대비해 최대 140초, 반환 준비 여유 2.5초를 둔다. Gemini 스트리밍으로 받은 완성 문장만 부분 분석으로 반환한다. 부분 결과는 저장하지 않는다. 내부 추론·안전 차단 응답은 표시하지 않는다.
- 전체 매체 합계와 비교일이 맞을 때만 매출 증가액·기여 비중을 코드로 검증해 덧붙인다. AI의 주도·견인·기여·뒷받침 주장은 정리한다. 일부 캠페인만으로 전체 기여를 판단하지 않는다.
- 유의미하게 등 과장 표현과 자주 쓰는 지표 띄어쓰기를 교정한다. 모든 AI 문장의 맞춤법·수치·인과 해석을 보증하는 기능은 아니다.
- 대시보드와 기존 CSV/API 연결 계약을 바꾸지 않고 SummaryPage에 카드만 추가했다.

## 비용과 한도: 반드시 유지

- **유료 검색·시즌·사회 이슈 자동 조사는 현재 없음.** research.js와 관련 테스트를 최종 정리에서 제거했다. Supabase 배포 파일은 index.ts, handler.js, weather.js 세 개다.
- ADPORTER_AI_ENABLED=true일 때만 AI 호출. Google 프로젝트가 Free Tier임을 사용자가 확인했다. 설정 스위치가 Google 결제 등급을 실시간 검증하는 것은 아니다. 다른 서비스의 키·모델 설정은 변경하지 않는다.
- Secret 이름: ADPORTER_GEMINI_API_KEY, ADPORTER_GEMINI_MODEL, ADPORTER_AI_ALLOWED_USER_IDS, ADPORTER_AI_ENABLED. 키·UID 실제 값은 문서나 소스에 넣지 않았다.
- 사용자당 하루 10회·전체 하루 20회·최소 1분 간격, 한국 시간 자정 초기화. 실패·시간 초과도 계산한다. 캐시 재사용은 추가 Gemini 생성 없음. 자동 재시도·유료 대체 모델 없음.
- 사용자 데이터 원본·고객명·실제 캠페인명은 보내지 않지만 집계 숫자·메모·업종 설정은 Gemini에 전송된다. 무료 입력의 데이터 처리 조건을 유의한다.
- 날씨 무료 API는 포트폴리오 비상업 데모용이다. 실제 상업 운영은 별도 이용 조건 확인이 필요하다.

## DB와 서버

- `supabase/migrations/202610190001_ai_comment_limits.sql`: AI 기록 테이블·예약 RPC 추가. 기존 reports 테이블은 수정하지 않는다.
- 기록: 소유자 UID, 입력 해시, 시각, 완성 코멘트, 날씨 정보, 비활성 검색 상태, 호출 단위. call_units=2를 허용하는 스키마는 예전 배포 호환이며 현재 서버는 항상 1을 예약한다.
- 테이블·RPC는 anon/authenticated 직접 접근을 차단하고 service_role만 사용한다. 함수는 Auth 서버로 토큰 검증 후 허용 UID를 검사한다. Verify JWT OFF는 이 내부 검증을 전제로 한다.
- 동일 해시의 완성 결과를 한도보다 먼저 조회하고, 신규 예약은 PostgreSQL 트랜잭션 잠금으로 한도를 강제한다.
- 기록 삭제는 한도와 캐시를 모두 바꾸므로 임의로 실행하지 않는다. 사용자는 시연 중 별도 SQL로 본인 오늘 기록 초기화를 시도한 적이 있다. Google 할당량은 DB 삭제로 복구되지 않는다.
- 최종 검사에서 스트림의 안전 차단 종료 사유가 타임아웃으로 덮이지 않도록 보완했다. **이 마지막 handler.js 변경은 사용자가 다시 배포하기 전까지 클라우드에 반영되지 않는다.** SQL·Secret 재변경은 필요 없다.

## 검증 결과와 한계

- 2026-10-19 전체 Node 테스트: 364개 통과, 실패 0.
- npm run lint / npm run build 통과. 빌드에는 500kB 초과 청크 경고가 남는다. 이번 기능 배포의 실패는 아니며 별도 최적화 과제다.
- handler.js·weather.js 문법 검사, diff 공백 검사와 작업 소스의 알려진 API 키 형태 검사에서 문제 없음.
- 자동 테스트는 모의 네트워크다. 실제 Gemini 생성 성공은 사용자가 브라우저 결과를 공유해 확인했다. 실제 날씨 API도 서울 좌표·날짜만으로 응답을 확인했다.
- 라이브 PostgreSQL의 동시 요청·RLS 검증, 새로운 브라우저에서 로그인부터 배포된 한클래스 embed까지의 종합 확인은 이번 최종 자동 검사에 포함하지 않았다.
- 사용자 제공 `코덱스 일본어.png`는 기능과 관계없는 미추적 파일로 남겨 두었다. 커밋에 무심코 포함하지 않는다.
- 추가 CSV: sample-data/demo_reports_추가_2026-10-16_2026-10-20.csv, 180행 가상 자료. 고객 데이터가 아니다. 일회성 생성 스크립트는 제거했다.

## 남은 순서

### 추가 요청에 따른 최종 확인

- 사용자가 재배포 전이라도 가능한 검사를 진행하고 남은 작업을 기록하도록 요청했다. 테스트·린트·빌드를 다시 실행했다. 아래 검사 결과는 소스 상태 검사이며 Supabase 재배포 뒤의 라이브 검증을 대신하지 않는다.
- 현재 도구에 Supabase 전용 연결과 CLI가 없어 브라우저로 재배포를 시도했으나 Supabase 로그인 화면으로 이동했다. 연결된 브라우저에 인증된 세션이 없어 실제 재배포는 하지 못했다. 비밀번호·API 키를 요청하거나 읽지 않았다.
- main 병합·배포 전 승인과, 변경 파일을 골라 커밋할지에 대한 승인은 아직 받지 않았다. git add/commit/push는 실행하지 않았다.

### 다른 저장소와 발표 후 이관 (사용자 전달 사항, 독립 검증하지 않음)

- 한클래스의 커뮤니티 보호·운영자·영상·열린 강의만 신청 관련 SQL은 DB 적용 대기라고 전달받았다. 이 저장소에서 해당 SQL을 실행하거나 다른 저장소 파일을 변경하지 않았다.
- 발표 뒤 Supabase를 세시드와 분리할 때 Adporter도 함께 이관한다. report-comment의 세 코드 파일, ADPORTER_ 전용 Secret 4개, AI 한도 테이블·예약 RPC·기존 완성 코멘트 및 호출 기록을 고려한다. Google 키 실제 값은 비밀값 경로로만 옮긴다.
- Adporter 인증 사용자와 reports 데이터/RLS도 새 프로젝트에서 접근 가능한지 확인한다. Auth UID가 바뀌면 AI 허용 UID와 owner_id 연결을 확인해야 한다. 프론트엔드의 Supabase 공개 연결 설정·로그인 리디렉션·한클래스 연결도 새 프로젝트 기준으로 검증한다.
- 별도 상업용 날씨 키를 등록했다면 그 선택 설정도 확인한다. 세시드·서류도우미의 기존 GEMINI_ Secret을 Adporter 설정으로 덮어쓰지 않는다.

### 커밋 범위

- README.md, sample-data/README.md, src/pages/SummaryPage.jsx
- docs/claude-handoff.md, docs/gemini-setup.md
- sample-data/demo_reports_추가_2026-10-16_2026-10-20.csv
- src/api/ai-report.js, src/components/ReportComment.jsx
- src/utils/ai-report.js 및 ai-report.test.js, attribution.test.js, deadline.js 및 deadline.test.js, report-comment.js 및 report-comment.test.js, stream-comment.test.js, weather.test.js
- supabase/functions/report-comment/index.ts, handler.js, weather.js
- supabase/migrations/202610190001_ai_comment_limits.sql
- 사용자 PNG, 환경변수 파일, 빌드 산출물·node_modules는 포함하지 않는다.

1. 최종 handler.js를 사용자가 Supabase에 업데이트하고 필요 시 데모 데이터로 확인한다. 재시도는 일일 한도와 1분 제한을 소비한다.
2. 사용자 승인 후 변경 파일만 명시해 커밋한다. unrelated PNG·환경변수 파일을 포함하지 않는다.
3. 사용자 승인 후 main 반영·사이트 배포. 단독 화면·로그인·CSV 업로드·필터·새로고침 캐시·한클래스 iframe/크게 보기를 점검한다.
4. 문제 시 프론트엔드와 Supabase 함수 배포는 별도로 되돌린다. 긴급 AI 중지는 ADPORTER_AI_ENABLED=false로 설정한다. 광고 원본이나 한도 테이블을 삭제하는 방식으로 복구하지 않는다.

자세한 설정과 동작은 `docs/gemini-setup.md`에 정리했다.
