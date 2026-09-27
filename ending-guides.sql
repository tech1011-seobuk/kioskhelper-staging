-- Additive staging migration. Existing diagnosis content is not rewritten.
begin;
create table if not exists public.helper_ending_guides (
 id text primary key check(id in ('solved','escalate','as','info') or id ~ '^custom_[a-f0-9]{32}$'),
 label text not null check(length(btrim(label)) between 1 and 120),
 body text not null check(length(btrim(body)) between 1 and 10000),
 result_type text not null check(result_type in ('solved','escalate','as','info')),
 device_notes jsonb not null default '{}',
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null,
 check(id not in ('solved','escalate','as','info') or result_type=id)
);
alter table public.helper_ending_guides enable row level security;
revoke all on public.helper_ending_guides from anon,authenticated;
grant select on public.helper_ending_guides to authenticated;
drop policy if exists "Signed in users read ending guides" on public.helper_ending_guides;
create policy "Signed in users read ending guides" on public.helper_ending_guides for select to authenticated using(true);
create or replace function public.save_ending_guide(p_id text,p_label text,p_body text,p_result_type text,p_device_notes jsonb,p_expected_revision integer)
returns public.helper_ending_guides language plpgsql security definer set search_path='' as $$
declare r public.helper_ending_guides; n record;
begin
 if auth.uid() is null or not public.is_admin() then raise exception '관리자만 수정할 수 있습니다.' using errcode='42501'; end if;
 if p_expected_revision is null or p_expected_revision<0 or jsonb_typeof(p_device_notes) is distinct from 'object' or octet_length(p_device_notes::text)>100000 then raise exception '입력 형식을 확인해주세요.'; end if;
 for n in select key,value from jsonb_each(p_device_notes) loop
  if length(n.key)>120 or jsonb_typeof(n.value) is distinct from 'string' or length(n.value#>>'{}')>5000 then raise exception '장비별 설명을 확인해주세요.'; end if;
 end loop;
 if p_expected_revision=0 then
  insert into public.helper_ending_guides(id,label,body,result_type,device_notes,updated_by) values(p_id,p_label,p_body,p_result_type,p_device_notes,auth.uid()) on conflict do nothing returning * into r;
 else
  update public.helper_ending_guides set label=p_label,body=p_body,device_notes=p_device_notes,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=p_id and revision=p_expected_revision and result_type=p_result_type returning * into r;
 end if;
 if r.id is null then raise exception '다른 수정이 먼저 저장되었습니다. 입력 내용을 복사한 뒤 최신 화면을 다시 열어주세요.' using errcode='40001'; end if;
 return r;
end; $$;
revoke all on function public.save_ending_guide(text,text,text,text,jsonb,integer) from public,anon;
grant execute on function public.save_ending_guide(text,text,text,text,jsonb,integer) to authenticated;
-- Extend only the existing ending validation; retain administrator/revision/media guards.
do $$
declare body text; original text := 'v_opt->>''end'' not in (''solved'',''escalate'',''as'',''info'')'; replacement text := '(v_opt->>''end'' not in (''solved'',''escalate'',''as'',''info'') and not exists(select 1 from public.helper_ending_guides where id=v_opt->>''end''))';
begin
 body:=pg_get_functiondef('public.save_diagnosis_tree(text,jsonb,integer)'::regprocedure);
 if position('public.helper_ending_guides' in body)=0 then
  if position(original in body)=0 then raise exception '진단 저장 함수가 예상 버전과 다릅니다. 기존 내용은 변경하지 않았습니다.'; end if;
  execute replace(body,original,replacement);
 end if;
end $$;
commit;
