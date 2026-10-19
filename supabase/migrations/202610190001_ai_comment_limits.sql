-- Adporter AI 전용. 광고 보고서와 다른 함수의 테이블은 변경하지 않는다.
begin;
create table if not exists public.adporter_ai_requests (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_hash text not null,
  created_at timestamptz not null default clock_timestamp(),
  comment text check (length(comment) <= 1500)
);
alter table public.adporter_ai_requests add column if not exists generated_at timestamptz;
alter table public.adporter_ai_requests add column if not exists weather_context jsonb;
alter table public.adporter_ai_requests add column if not exists research_context jsonb;
alter table public.adporter_ai_requests add column if not exists call_units integer not null default 1 check (call_units between 1 and 2);
create index if not exists adporter_ai_requests_created_idx on public.adporter_ai_requests(created_at);
create index if not exists adporter_ai_requests_owner_hash_idx on public.adporter_ai_requests(owner_id, request_hash, created_at desc);
alter table public.adporter_ai_requests enable row level security;
revoke all on public.adporter_ai_requests from public, anon, authenticated;
grant select, insert, update on public.adporter_ai_requests to service_role;
grant usage, select on sequence public.adporter_ai_requests_id_seq to service_role;

drop function if exists public.adporter_reserve_ai_request(uuid, text);
create or replace function public.adporter_reserve_ai_request(p_owner uuid, p_hash text, p_units integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  day_start timestamptz;
  cached text;
  cached_at timestamptz;
  cached_weather jsonb;
  cached_research jsonb;
  request_id bigint;
  now_at timestamptz;
begin
  if p_owner is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_units is null or p_units not in (1, 2) then
    raise exception '잘못된 AI 요청입니다.';
  end if;
  -- 모든 예약을 같은 트랜잭션 잠금으로 직렬화해 동시 요청도 한도를 넘지 못하게 한다.
  perform pg_advisory_xact_lock(1900261019);
  now_at := clock_timestamp();
  day_start := date_trunc('day', now_at at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  select r.comment, coalesce(r.generated_at, r.created_at), r.weather_context, r.research_context into cached, cached_at, cached_weather, cached_research from public.adporter_ai_requests r
    where r.owner_id = p_owner and r.request_hash = p_hash and r.comment is not null
    order by r.created_at desc limit 1;
  if cached is not null then return jsonb_build_object('comment', cached, 'cached', true, 'generatedAt', cached_at, 'weather', cached_weather, 'research', cached_research); end if;
  if exists (select 1 from public.adporter_ai_requests where owner_id = p_owner and created_at > now_at - interval '1 minute') then
    return jsonb_build_object('error', '1분 후 다시 생성해 주세요.');
  end if;
  if (select coalesce(sum(call_units), 0) from public.adporter_ai_requests where owner_id = p_owner and created_at >= day_start) + p_units > 10 then
    return jsonb_build_object('error', '오늘 계정별 AI 호출 한도(10회)에 도달했습니다. 한국 시간 자정에 초기화됩니다.');
  end if;
  if (select coalesce(sum(call_units), 0) from public.adporter_ai_requests where created_at >= day_start) + p_units > 20 then
    return jsonb_build_object('error', '오늘 Adporter 전체 AI 호출 한도(20회)에 도달했습니다. 한국 시간 자정에 초기화됩니다.');
  end if;
  insert into public.adporter_ai_requests(owner_id, request_hash, created_at, call_units)
    values (p_owner, p_hash, now_at, p_units) returning id into request_id;
  return jsonb_build_object('id', request_id, 'cached', false);
end;
$$;
revoke all on function public.adporter_reserve_ai_request(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.adporter_reserve_ai_request(uuid, text, integer) to service_role;
commit;
