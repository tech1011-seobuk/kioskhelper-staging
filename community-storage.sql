-- Run on staging mjzhljlhjsbnnxyekmwy only. Additive: no existing data changed.
begin;
create table if not exists public.helper_announcements (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(btrim(title)) between 1 and 120),
 body text not null check(length(btrim(body)) between 1 and 10000),
 kind text not null default '안내' check(kind in ('안내','업데이트 예정','업데이트 완료','점검')),
 published boolean not null default false,
 important boolean not null default false,
 starts_at timestamptz not null default now(),
 ends_at timestamptz,
 created_at timestamptz not null default now(),
 check(ends_at is null or ends_at > starts_at)
);
create table if not exists public.helper_notice_reads (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 notice_id uuid not null references public.helper_announcements(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,notice_id)
);
create table if not exists public.helper_suggestions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 category text not null check(category in ('조치 안내','사진·영상','사용 불편','기타')),
 body text not null check(length(btrim(body)) between 1 and 3000),
 context text not null default '' check(length(context)<=300),
 status text not null default '접수' check(status in ('접수','검토 중','반영 예정','반영 완료','보류')),
 reply text not null default '' check(length(reply)<=3000),
 created_at timestamptz not null default now()
);
create table if not exists public.helper_ratings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 attempt_id uuid not null,
 score integer not null check(score between 1 and 5),
 created_at timestamptz not null default now(), unique(user_id,attempt_id)
);
alter table public.helper_announcements enable row level security;
alter table public.helper_notice_reads enable row level security;
alter table public.helper_suggestions enable row level security;
alter table public.helper_ratings enable row level security;
-- Existing admin guard; no role changes or new admins.
create policy helper_notices_read on public.helper_announcements for select to authenticated using(public.is_admin() or (published and starts_at <= now()));
create policy helper_notices_insert on public.helper_announcements for insert to authenticated with check(public.is_admin());
create policy helper_notices_update on public.helper_announcements for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy helper_reads_read on public.helper_notice_reads for select to authenticated using(user_id=auth.uid());
create policy helper_reads_insert on public.helper_notice_reads for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.helper_announcements where id=notice_id));
create policy helper_suggestions_read on public.helper_suggestions for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy helper_suggestions_insert on public.helper_suggestions for insert to authenticated with check(user_id=auth.uid() and status='접수' and reply='');
create policy helper_suggestions_update on public.helper_suggestions for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy helper_ratings_read on public.helper_ratings for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy helper_ratings_insert on public.helper_ratings for insert to authenticated with check(user_id=auth.uid());
revoke all on public.helper_announcements, public.helper_notice_reads, public.helper_suggestions, public.helper_ratings from anon, authenticated;
grant select on public.helper_announcements, public.helper_notice_reads, public.helper_suggestions, public.helper_ratings to authenticated;
grant insert(title,body,kind,published,important,starts_at,ends_at), update(title,body,kind,published,important,starts_at,ends_at) on public.helper_announcements to authenticated;
grant insert(notice_id) on public.helper_notice_reads to authenticated;
grant insert(id,category,body,context), update(status,reply) on public.helper_suggestions to authenticated;
grant insert(attempt_id,score) on public.helper_ratings to authenticated;
create index helper_suggestions_date on public.helper_suggestions(created_at desc);
create index helper_suggestions_owner on public.helper_suggestions(user_id,created_at desc);
commit;
