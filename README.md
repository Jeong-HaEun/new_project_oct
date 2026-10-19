# Adporter — Supabase + GitHub Pages

`project_oct`의 React 화면, 광고 지표 계산, 매체·기간·요일 필터, 그래프, CSV 업로드·다운로드를 유지한 전환본입니다.
별도 Render API/Aiven DB 대신 Supabase Auth + PostgreSQL + Data API를 사용합니다.

## 달라진 점

- React를 그대로 유지합니다. GitHub Pages는 Vite 빌드 결과인 정적 파일을 제공합니다.
- 로그인한 계정의 데이터만 조회·저장합니다. 공개 키가 보여도 RLS(계정별 접근 규칙)가 다른 계정의 접근을 차단합니다.
- CSV는 날짜 + 매체 + 캠페인 + 광고그룹 + 소재가 같으면 덮어씁니다. 계정 사이에는 별개 데이터입니다.
- 한 업로드는 DB 트랜잭션 하나로 실행합니다. 오류가 있으면 전체 취소됩니다. 한 파일 최대 10,000줄입니다.
- 기본 API 행 수 제한을 피하도록 500줄씩 전체 조회합니다.
- 주소는 `/#/`, `/#/data?media=META` 형태입니다. GitHub Pages에서 새로고침과 하위 저장소 경로를 지원합니다.
- 실제 데이터는 로그인 뒤 표시합니다. 누구나 보는 포트폴리오 데모 모드는 이번 버전에 포함하지 않았습니다.

## 1. Supabase 준비 (최초 한 번)

1. Supabase에서 새 프로젝트를 만듭니다. 기존 DB와 섞이지 않는 새 프로젝트를 권장합니다.
2. SQL Editor에서 `supabase/migrations/202610160001_reports.sql` 전체를 실행합니다.
3. Authentication → Users에서 이용할 계정을 추가하고, 비밀번호를 지정합니다. 필요하면 이메일 확인 완료 상태로 생성합니다. 비밀번호는 채팅이나 저장소에 올리지 않습니다.
4. 운영자만 쓰는 서비스라면 Authentication 설정에서 신규 회원가입을 비활성화합니다. 이 화면은 공개 회원가입을 제공하지 않습니다.
5. 프로젝트 연결 정보에서 Project URL과 **publishable 키**(또는 legacy `anon` 키)를 확인합니다. **secret / service_role 키와 DB 비밀번호는 프론트엔드에 넣으면 안 됩니다.**

SQL을 다시 실행해도 기존 보고서를 삭제하지 않습니다. 다만 다른 구조의 기존 `reports` 테이블을 자동 변환하는 스크립트는 아닙니다.

## 2. 로컬 실행

Node.js 24, npm을 사용합니다.

```bash
cd /workspace/new_project_oct
npm ci
cp .env.example .env.local
```

`.env.local`에 공개 연결 정보를 입력합니다.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

```bash
npm run dev
```

로그인 후 `sample-data/` CSV로 먼저 확인하세요. 실제 고객 데이터를 테스트용 공개 저장소에 올리지 마세요.
연결 정보가 없으면 설정 안내 화면을 표시하며, 가짜 데이터를 실제 데이터처럼 표시하지 않습니다.

## 3. GitHub Pages 배포

1. GitHub에 `new_project_oct` 저장소를 만들거나 준비된 대상 저장소를 사용합니다.
2. 이 폴더의 소스 전체를 올립니다. `node_modules`, `dist`, `.env.local`은 올리지 않습니다. 원본 `project_oct`는 그대로 보관합니다.
3. 저장소 Settings → Secrets and variables → Actions → **Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 등록합니다. 두 값은 빌드된 브라우저 코드에 공개되므로 비밀키를 등록하지 마세요.
4. Settings → Pages → Source를 **GitHub Actions**로 선택합니다.
5. `main`에 push하거나 Actions의 ‘GitHub Pages 배포’를 수동 실행합니다.
6. 워크플로가 테스트·린트·빌드를 완료한 뒤 Pages에 게시합니다.

기본 저장소 이름이 `new_project_oct`이면 주소는 `https://Jeong-HaEun.github.io/new_project_oct/`입니다. 이 주소는 배포 후에만 유효합니다.
기존 사이트와 연결하려면 배포된 주소로 링크하면 됩니다. React를 다른 사이트의 순수 JS로 변환할 필요는 없습니다.
Supabase Auth의 Site URL도 실제 배포 주소로 맞추세요. 현재 이메일·비밀번호 로그인은 외부 리디렉션을 사용하지 않습니다. 추후 이메일 링크/OAuth를 추가할 때는 redirect allowlist와 hash 라우터를 별도로 검증해야 합니다.

## 4. 검증

광고주 보고용 자동 코멘트·Gemini 설정·호출 한도·날씨 참고 기능은 [성과 코멘트 운영 안내](docs/gemini-setup.md)를 참고하세요. 유료 검색은 사용하지 않으며 프론트엔드와 Supabase 함수 배포는 별도입니다.

```bash
npm test
npm run lint
npm run build
npm run preview
```

배포 후 확인:

1. 로그아웃 상태에서는 보고서가 보이지 않는지 확인합니다.
2. 계정 A로 로그인 → 샘플 CSV 업로드 → 새로고침해도 데이터가 유지되는지 확인합니다.
3. 같은 CSV를 다시 업로드 → 새로 생성하지 않고 수정 건수로 집계되는지 확인합니다.
4. 다른 계정 B에서는 A의 데이터가 보이지 않는지 확인합니다.
5. ‘원본 데이터’에서 필터·다운로드를 확인하고, 그 주소에서 새로고침합니다.

`supabase/tests/reports.sql`은 SQL 정책·원자성·중복 처리 검증용입니다. **운영 DB에서 실행하지 마세요.** 테스트 계정이 포함된 일회용 PostgreSQL에서 실행하도록 준비됐습니다. 실행 방법은 파일 상단에 있습니다.

## 제한과 이전 작업

- 원본 저장소에는 Java 등의 백엔드 소스가 없습니다. 따라서 API 명세에 따라 현재 UI에서 사용하는 목록 조회·일괄 저장을 구현했습니다. 기존 단건 POST/PUT/DELETE HTTP 경로를 그대로 제공하는 서버는 아닙니다. 화면에 없던 단건 편집 기능도 새로 추가하지 않았습니다.
- 기존 Aiven의 실데이터는 제공되지 않아 자동 이전하지 않았습니다. 기존 보고서에서 CSV를 내려받은 후 새 서비스에 업로드할 수 있습니다.
- Supabase 무료 프로젝트도 정책과 이용 상태에 따라 일시 중지되거나 제한될 수 있습니다. 이 전환이 모든 대기 시간을 없애는 것은 아닙니다.
- 페이지 정적 파일은 공개되어도 보고서 데이터는 계정별 비공개입니다. 방문자용 샘플 보고서가 필요하면 별도 데모 모드로 분리하세요.
- 큰 보고서는 모든 행을 브라우저로 가져옵니다. 대규모 데이터 운영 시 서버 측 집계·조회 범위를 검토해야 합니다.
- Supabase 프로젝트 연결과 GitHub Pages 실제 게시 전에는 클라우드 실연결 검증이 완료된 것이 아닙니다.
