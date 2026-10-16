-- 운영 DB 금지. 빈 일회용 PostgreSQL의 postgres 계정으로 실행한다.
-- 예: psql -v ON_ERROR_STOP=1 -f supabase/tests/reports.sql
-- Supabase의 auth.uid()와 역할만 모사한다. 실제 Supabase Auth/API 검증은 별도로 필요하다.
\set ON_ERROR_STOP on
begin;
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
\ir ../migrations/202610160001_reports.sql
-- 반복 실행 시 기존 테이블을 유지하는지 확인한다.
\ir ../migrations/202610160001_reports.sql
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
create function public.test_payload() returns jsonb language sql as $$
 select '[{"reportDate":"2026-10-01","media":"NAVER","campaignName":"테스트","adGroupName":"그룹","creativeName":"소재","cost":100,"impressions":1000,"clicks":10,"carts":2,"conversions":1,"revenue":300}]'::jsonb
$$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
declare r jsonb; bad jsonb;
begin
  r := public.bulk_upsert_reports(public.test_payload());
  if r <> '{"created":1,"updated":0}'::jsonb then raise exception '생성 집계 실패'; end if;
  r := public.bulk_upsert_reports(public.test_payload());
  if r <> '{"created":0,"updated":1}'::jsonb then raise exception '재업로드 집계 실패'; end if;
  r := public.bulk_upsert_reports(public.test_payload() || jsonb_set(public.test_payload(), '{0,cost}', '200'));
  if r <> '{"created":0,"updated":2}'::jsonb then raise exception '중복 입력 집계 실패'; end if;
  if (select cost from public.reports) <> 200 then raise exception '마지막 줄 덮어쓰기 실패'; end if;
  bad := jsonb_set(public.test_payload(), '{0,creativeName}', '"신규"') || jsonb_set(public.test_payload(), '{0,cost}', '-1');
  begin
    perform public.bulk_upsert_reports(bad);
    raise exception '음수 허용 오류';
  exception when invalid_parameter_value then null;
  end;
  if (select count(*) from public.reports) <> 1 then raise exception '부분 저장 발생'; end if;
  begin
    perform public.bulk_upsert_reports(jsonb_set(public.test_payload(), '{0,cost}', '1.5'));
    raise exception '소수 허용 오류';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.bulk_upsert_reports(jsonb_set(public.test_payload(), '{0,reportDate}', '"2026-02-30"'));
    raise exception '없는 날짜 허용 오류';
  exception when datetime_field_overflow then null;
  end;
  begin
    perform public.bulk_upsert_reports(jsonb_set(public.test_payload(), '{0,revenue}', '9007199254740992'));
    raise exception '안전 정수 초과 허용 오류';
  exception when check_violation then null;
  end;
  begin
    perform public.bulk_upsert_reports('[]');
    raise exception '빈 배열 허용 오류';
  exception when invalid_parameter_value then null;
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$
begin
  if (select count(*) from public.reports) <> 0 then raise exception '다른 계정 데이터 노출'; end if;
  perform public.bulk_upsert_reports(public.test_payload());
  if (select count(*) from public.reports) <> 1 then raise exception '계정별 별개 데이터 저장 실패'; end if;
  update public.reports set cost = 999 where owner_id = '00000000-0000-0000-0000-000000000001';
  if found then raise exception '다른 계정 데이터 수정 허용'; end if;
  begin
    update public.reports set owner_id = '00000000-0000-0000-0000-000000000001';
    raise exception '소유자 위조 허용';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role anon;
do $$
begin
  begin
    perform * from public.reports;
    raise exception '익명 조회 허용';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.bulk_upsert_reports(public.test_payload());
    raise exception '익명 업로드 허용';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
\echo '통과: 생성·재업로드·중복·원자성·입력 검증·계정 격리·익명 차단·반복 실행'
