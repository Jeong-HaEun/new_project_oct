-- Supabase SQL Editor에서 실행. 기존 프로젝트와 분리된 새 프로젝트 권장.
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  "reportDate" date not null check ("reportDate" between date '0001-01-01' and date '9999-12-31'),
  media text not null check (media in ('NAVER', 'META', 'GOOGLE')),
  "campaignName" varchar(100) not null check (length(trim("campaignName")) > 0),
  "adGroupName" varchar(100) not null check (length(trim("adGroupName")) > 0),
  "creativeName" varchar(100) not null check (length(trim("creativeName")) > 0),
  cost bigint not null check (cost between 0 and 9007199254740991),
  impressions bigint not null check (impressions between 0 and 9007199254740991),
  clicks bigint not null check (clicks between 0 and 9007199254740991),
  carts bigint not null check (carts between 0 and 9007199254740991),
  conversions bigint not null check (conversions between 0 and 9007199254740991),
  revenue bigint not null check (revenue between 0 and 9007199254740991),
  unique (owner_id, "reportDate", media, "campaignName", "adGroupName", "creativeName")
);
create index if not exists reports_owner_date_idx on public.reports(owner_id, "reportDate" desc, id);
alter table public.reports enable row level security;
drop policy if exists reports_own_data on public.reports;
create policy reports_own_data on public.reports for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
revoke all on public.reports from anon;
grant select, insert, update, delete on public.reports to authenticated;
grant usage, select on sequence public.reports_id_seq to authenticated;

create or replace function public.bulk_upsert_reports(rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  field_name text;
  inserted boolean;
  created_count integer := 0;
  updated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.' using errcode = '42501';
  end if;
  if jsonb_typeof(rows) is distinct from 'array' then
    raise exception '배열이 필요합니다.' using errcode = '22023';
  end if;
  if jsonb_array_length(rows) < 1 or jsonb_array_length(rows) > 10000 then
    raise exception '1~10000줄만 저장할 수 있습니다.' using errcode = '22023';
  end if;
  -- 같은 계정의 동시 CSV 처리를 직렬화한다. 실패하면 전체 요청이 롤백된다.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 0));
  for item in select value from pg_catalog.jsonb_array_elements(rows) loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception '각 줄은 객체여야 합니다.' using errcode = '22023';
    end if;
    foreach field_name in array array['reportDate','media','campaignName','adGroupName','creativeName'] loop
      if jsonb_typeof(item->field_name) is distinct from 'string' then
        raise exception '필수 문자 필드 오류: %', field_name using errcode = '22023';
      end if;
    end loop;
    if (item->>'reportDate') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception '날짜 형식 오류' using errcode = '22023';
    end if;
    foreach field_name in array array['cost','impressions','clicks','carts','conversions','revenue'] loop
      if jsonb_typeof(item->field_name) is distinct from 'number'
        or (item->>field_name) !~ '^\d+$' then
        raise exception '0 이상 정수가 필요합니다: %', field_name using errcode = '22023';
      end if;
    end loop;
    insert into public.reports (
      owner_id, "reportDate", media, "campaignName", "adGroupName", "creativeName",
      cost, impressions, clicks, carts, conversions, revenue
    ) values (
      auth.uid(), (item->>'reportDate')::date, item->>'media', item->>'campaignName',
      item->>'adGroupName', item->>'creativeName', (item->>'cost')::bigint,
      (item->>'impressions')::bigint, (item->>'clicks')::bigint, (item->>'carts')::bigint,
      (item->>'conversions')::bigint, (item->>'revenue')::bigint
    ) on conflict (owner_id, "reportDate", media, "campaignName", "adGroupName", "creativeName")
    do update set cost = excluded.cost, impressions = excluded.impressions,
      clicks = excluded.clicks, carts = excluded.carts,
      conversions = excluded.conversions, revenue = excluded.revenue
    returning (xmax = 0) into inserted;
    if inserted then created_count := created_count + 1;
    else updated_count := updated_count + 1;
    end if;
  end loop;
  return jsonb_build_object('created', created_count, 'updated', updated_count);
end;
$$;
revoke all on function public.bulk_upsert_reports(jsonb) from public, anon;
grant execute on function public.bulk_upsert_reports(jsonb) to authenticated;
