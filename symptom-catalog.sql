-- Additive symptom catalog overrides. Archived trees and statistics are retained.
begin;
create table if not exists public.helper_symptom_catalog (
 symptom_id text primary key references public.diagnosis_trees(symptom_id),
 label text not null check(length(btrim(label)) between 1 and 120),
 device text not null check(length(device) between 1 and 80),
 scope text not null check(scope in ('photoism','snapism','shared')),
 active boolean not null default true,
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.helper_symptom_catalog enable row level security;
revoke all on public.helper_symptom_catalog from anon,authenticated;
grant select on public.helper_symptom_catalog to authenticated;
create policy symptom_catalog_read on public.helper_symptom_catalog for select to authenticated using(true);
create or replace function public.save_symptom_catalog(p_id text,p_label text,p_device text,p_scope text,p_active boolean,p_revision integer)
returns public.helper_symptom_catalog language plpgsql security definer set search_path='' as $$
declare r public.helper_symptom_catalog; initial jsonb:='{"start":"n1","nodes":{"n1":{"text":"안내 준비 중입니다.","options":[{"label":"확인했습니다","end":"info"}]}}}';
begin
 if auth.uid() is null or not public.is_admin() then raise exception '관리자만 변경할 수 있습니다.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(7241961);
 if p_revision is null or p_revision<0 or p_active is null then raise exception '항목 정보를 확인해주세요.'; end if;
 if p_device not in ('에스라이트','지속광','카메라','모니터','프린터','PC','카드리더기','지폐투입기','리모컨 / 서비스코인 / 설정','CMS','서비스코인','CX7600 프린터 (포토카드)','DS620 프린터 (스티커)') then raise exception '장비 정보를 확인해주세요.';end if;
 if not exists(select 1 from public.diagnosis_trees where symptom_id=p_id) then
  if p_revision<>0 or p_id !~ '^CUS-[A-F0-9]{32}$' then raise exception '새 항목 ID를 확인해주세요.';end if;
  insert into public.diagnosis_trees(symptom_id,tree,updated_by) values(p_id,initial,auth.uid());
  insert into public.diagnosis_tree_revisions(symptom_id,revision,tree,updated_at,updated_by) values(p_id,1,initial,now(),auth.uid());
 end if;
 if p_active and exists(select 1 from public.diagnosis_trees d cross join lateral jsonb_each(d.tree->'nodes') n cross join lateral jsonb_array_elements(n.value->'options') o join public.helper_symptom_catalog c on c.symptom_id=o->>'jump' where d.symptom_id=p_id and not c.active) then raise exception '삭제된 증상으로 연결된 선택지를 먼저 수정해주세요.';end if;
 if not p_active and exists(select 1 from public.diagnosis_trees d left join public.helper_symptom_catalog c on c.symptom_id=d.symptom_id cross join lateral jsonb_each(d.tree->'nodes') n cross join lateral jsonb_array_elements(n.value->'options') o where d.symptom_id<>p_id and coalesce(c.active,true) and o->>'jump'=p_id) then raise exception '다른 증상의 선택지가 연결되어 있습니다. 연결을 변경한 뒤 삭제해주세요.';end if;
 if p_revision=0 then
  insert into public.helper_symptom_catalog(symptom_id,label,device,scope,active) values(p_id,btrim(p_label),p_device,p_scope,p_active) on conflict do nothing returning * into r;
 else
  update public.helper_symptom_catalog set label=btrim(p_label),active=p_active,revision=revision+1,updated_at=now() where symptom_id=p_id and revision=p_revision and device=p_device and scope=p_scope returning * into r;
 end if;
 if r.symptom_id is null then raise exception '다른 화면에서 먼저 수정했습니다. 창을 다시 열어주세요.' using errcode='40001';end if;
 return r;
end $$;
revoke all on function public.save_symptom_catalog(text,text,text,text,boolean,integer) from public,anon;
grant execute on function public.save_symptom_catalog(text,text,text,text,boolean,integer) to authenticated;
-- Requested removals; keep historical content. Check links first.
do $$ begin
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' limit 1),true);
 perform public.save_symptom_catalog('PRT-9','출력물 흰색 여백 발생','프린터','photoism',false,0);
 perform public.save_symptom_catalog('PRT-11','QR인식 불가','프린터','photoism',false,0);
 perform public.save_symptom_catalog('PRT-12','QR코드 기간 만료','프린터','photoism',false,0);
 perform public.save_symptom_catalog('PRT-14','QR코드 잘림','프린터','photoism',false,0);
 perform public.save_symptom_catalog('PC-3','용량 부족','PC','shared',false,0);
end $$;
create or replace function public.guard_symptom_links() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7241961);
 if exists(select 1 from jsonb_each(new.tree->'nodes') n cross join lateral jsonb_array_elements(n.value->'options') o join public.helper_symptom_catalog c on c.symptom_id=o->>'jump' where not c.active) then raise exception '삭제된 증상으로 연결할 수 없습니다.';end if;
 return new;
end $$;
revoke all on function public.guard_symptom_links() from public,anon,authenticated;
create trigger guard_symptom_links before insert or update of tree on public.diagnosis_trees for each row execute function public.guard_symptom_links();
commit;
