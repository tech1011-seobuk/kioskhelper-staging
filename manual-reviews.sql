-- Additive migration: preserve all diagnosis trees and browser review backups.
begin;
create table if not exists public.helper_manual_reviews (
 owner_id uuid not null references auth.users(id),
 symptom_id text not null check(length(symptom_id) between 1 and 160),
 status text not null check(status in ('검토 전','업데이트 중','픽스')),
 note text not null default '' check(length(note)<=500),
 content jsonb not null check(jsonb_typeof(content)='object'),
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 primary key(owner_id,symptom_id)
);
alter table public.helper_manual_reviews enable row level security;
revoke all on public.helper_manual_reviews from anon,authenticated;
grant select on public.helper_manual_reviews to authenticated;
drop policy if exists manual_review_owner on public.helper_manual_reviews;
create policy manual_review_owner on public.helper_manual_reviews for select to authenticated using(owner_id=auth.uid() and public.is_admin());
create or replace function public.save_manual_review(p_sid text,p_status text,p_note text,p_content jsonb,p_revision integer,p_import boolean default false)
returns public.helper_manual_reviews language plpgsql security definer set search_path='' as $$
declare r public.helper_manual_reviews;
begin
 if auth.uid() is null or not public.is_admin() then raise exception '관리자만 저장할 수 있습니다.' using errcode='42501'; end if;
 if p_revision is null or p_revision<0 or octet_length(p_content::text)>2000000 then raise exception '검수 기록 형식을 확인해주세요.'; end if;
 if p_revision=0 then
  insert into public.helper_manual_reviews(owner_id,symptom_id,status,note,content) values(auth.uid(),p_sid,p_status,p_note,p_content) on conflict do nothing returning * into r;
 else
  update public.helper_manual_reviews set status=p_status,note=p_note,content=p_content,revision=revision+1,updated_at=now() where owner_id=auth.uid() and symptom_id=p_sid and revision=p_revision and not p_import returning * into r;
 end if;
 if r.symptom_id is null and p_import and p_revision=0 then select * into r from public.helper_manual_reviews where owner_id=auth.uid() and symptom_id=p_sid; end if;
 if r.symptom_id is null then raise exception '다른 화면에서 먼저 저장했습니다. 메모를 보관한 뒤 다시 열어주세요.' using errcode='40001'; end if;
 return r;
end $$;
revoke all on function public.save_manual_review(text,text,text,jsonb,integer,boolean) from public,anon;
grant execute on function public.save_manual_review(text,text,text,jsonb,integer,boolean) to authenticated;
commit;
