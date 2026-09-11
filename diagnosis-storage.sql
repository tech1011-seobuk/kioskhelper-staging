-- Additive migration: apply to production AND the separate staging project.
-- No changes to existing profiles, events, or login credentials.
begin;
create or replace function public.valid_diagnosis_media(items jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
 if jsonb_typeof(items) is distinct from 'array' then return false; end if;
 if jsonb_array_length(items)>6 then return false; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item) is distinct from 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(item) k where k not in ('kind','path','url','name'))
    or item->>'kind' is null or item->>'kind' not in ('image','video','link')
    or jsonb_typeof(item->'name') is distinct from 'string' or length(btrim(item->>'name'))=0 or length(item->>'name')>200
    or (item ? 'path') = (item ? 'url') then return false; end if;
  if item ? 'path' then
   if jsonb_typeof(item->'path') is distinct from 'string' or item->>'path' !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|webm)$' or item->>'kind'='link' then return false; end if;
  else
   if jsonb_typeof(item->'url') is distinct from 'string' or length(item->>'url')>2000 or item->>'url' !~ '^https://[^[:space:]]+$' then return false; end if;
  end if;
 end loop;
 return true;
end; $$;
revoke all on function public.valid_diagnosis_media(jsonb) from public, anon, authenticated;

create table if not exists public.diagnosis_trees (
  symptom_id text primary key check(symptom_id ~ '^[A-Z][A-Z0-9-]{0,39}$'),
  tree jsonb not null,
  revision integer not null default 1 check(revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);
create table if not exists public.diagnosis_tree_revisions (
  symptom_id text not null references public.diagnosis_trees(symptom_id),
  revision integer not null,
  tree jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null,
  primary key(symptom_id, revision)
);
alter table public.diagnosis_trees enable row level security;
alter table public.diagnosis_tree_revisions enable row level security;
revoke all on public.diagnosis_trees, public.diagnosis_tree_revisions from anon, authenticated;
grant select on public.diagnosis_trees, public.diagnosis_tree_revisions to authenticated;
drop policy if exists "Signed in users read published diagnosis" on public.diagnosis_trees;
create policy "Signed in users read published diagnosis" on public.diagnosis_trees
for select to authenticated using(true);
drop policy if exists "Admins read diagnosis history" on public.diagnosis_tree_revisions;
create policy "Admins read diagnosis history" on public.diagnosis_tree_revisions
for select to authenticated using(public.is_admin());

-- The RPC is the only app write path: administrator check + validation + compare-and-swap.
create or replace function public.save_diagnosis_tree(
  p_symptom_id text, p_tree jsonb, p_expected_revision integer
) returns public.diagnosis_trees
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.diagnosis_trees;
  v_node record;
  v_opt jsonb;
  v_target text;
  v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception '관리자만 저장할 수 있습니다.' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception '먼저 최신 안내를 불러와주세요.' using errcode = '22023';
  end if;
  if p_tree is null or jsonb_typeof(p_tree) is distinct from 'object'
     or octet_length(p_tree::text) > 250000
     or jsonb_typeof(p_tree->'nodes') is distinct from 'object'
     or jsonb_typeof(p_tree->'start') is distinct from 'string' then
    raise exception '진단 안내 형식이 올바르지 않습니다.' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_tree) as k(key) where key not in ('start','nodes')) then
    raise exception '지원하지 않는 진단 항목입니다.' using errcode = '22023';
  end if;
  select count(*) into v_count from jsonb_object_keys(p_tree->'nodes');
  if v_count < 1 or v_count > 150 or not (p_tree->'nodes' ? (p_tree->>'start')) then
    raise exception '시작 단계 또는 단계 수를 확인해주세요.' using errcode = '22023';
  end if;
  for v_node in select key, value from jsonb_each(p_tree->'nodes') loop
    if v_node.key !~ '^[A-Za-z][A-Za-z0-9_]{0,39}$'
       or jsonb_typeof(v_node.value) is distinct from 'object'
       or jsonb_typeof(v_node.value->'text') is distinct from 'string'
       or length(btrim(v_node.value->>'text')) = 0 or length(v_node.value->>'text') > 20000
       or jsonb_typeof(v_node.value->'options') is distinct from 'array' then
      raise exception '단계 문구 또는 선택지를 확인해주세요: %', v_node.key using errcode = '22023';
    end if;
    if exists(select 1 from jsonb_object_keys(v_node.value) as k(key) where key not in ('text','options','attachment','media'))
       or ((v_node.value ? 'attachment') and (jsonb_typeof(v_node.value->'attachment') is distinct from 'string'
          or length(v_node.value->>'attachment') > 20000)) then
      raise exception '단계 부가 안내 형식이 올바르지 않습니다.' using errcode = '22023';
    end if;
    if v_node.value ? 'media' and not public.valid_diagnosis_media(v_node.value->'media') then raise exception '사진·영상 첨부 형식이 올바르지 않습니다.' using errcode='22023'; end if;
    if jsonb_array_length(v_node.value->'options') < 1 or jsonb_array_length(v_node.value->'options') > 12 then
      raise exception '선택지는 단계별로 1~12개여야 합니다.' using errcode = '22023';
    end if;
    for v_opt in select value from jsonb_array_elements(v_node.value->'options') loop
      if jsonb_typeof(v_opt) is distinct from 'object'
         or jsonb_typeof(v_opt->'label') is distinct from 'string'
         or length(btrim(v_opt->>'label')) = 0 or length(v_opt->>'label') > 500 then
        raise exception '선택지 문구를 확인해주세요.' using errcode = '22023';
      end if;
      if exists(select 1 from jsonb_object_keys(v_opt) as k(key) where key not in ('label','next','jump','end','note','attachment')) then
        raise exception '지원하지 않는 선택지 항목입니다.' using errcode = '22023';
      end if;
      if ((v_opt ? 'note') and (jsonb_typeof(v_opt->'note') is distinct from 'string' or length(v_opt->>'note') > 20000))
         or ((v_opt ? 'attachment') and (jsonb_typeof(v_opt->'attachment') is distinct from 'string' or length(v_opt->>'attachment') > 20000)) then
        raise exception '선택지 부가 안내를 확인해주세요.' using errcode = '22023';
      end if;
      v_count := (case when v_opt ? 'next' then 1 else 0 end)
        + (case when v_opt ? 'jump' then 1 else 0 end) + (case when v_opt ? 'end' then 1 else 0 end);
      if v_count <> 1 then
        raise exception '선택지에는 하나의 이동 또는 종료 결과가 필요합니다.' using errcode = '22023';
      end if;
      if v_opt ? 'next' then
        v_target := v_opt->>'next';
        if jsonb_typeof(v_opt->'next') is distinct from 'string' or not (p_tree->'nodes' ? v_target) then
          raise exception '없는 단계로 연결되어 있습니다.' using errcode = '22023';
        end if;
      elsif v_opt ? 'jump' then
        if jsonb_typeof(v_opt->'jump') is distinct from 'string' or not exists(
          select 1 from public.diagnosis_trees where symptom_id = v_opt->>'jump'
        ) then raise exception '없는 증상으로 연결되어 있습니다.' using errcode = '22023'; end if;
      elsif jsonb_typeof(v_opt->'end') is distinct from 'string' or v_opt->>'end' not in ('solved','escalate','as','info') then
        raise exception '종료 결과가 올바르지 않습니다.' using errcode = '22023';
      end if;
    end loop;
  end loop;
  -- Retry loops are allowed when every step has a path to an exit.
  if exists (
    with recursive can_finish(node_id) as (
      select n.key from jsonb_each(p_tree->'nodes') n
      where exists(select 1 from jsonb_array_elements(n.value->'options') o where o ? 'end' or o ? 'jump')
      union
      select n.key from can_finish f cross join jsonb_each(p_tree->'nodes') n
      cross join lateral jsonb_array_elements(n.value->'options') o
      where o->>'next' = f.node_id
    ) select 1 from jsonb_object_keys(p_tree->'nodes') n where n not in (select node_id from can_finish)
  ) then raise exception '종료로 이어지지 않는 단계가 있습니다.' using errcode = '22023'; end if;

  update public.diagnosis_trees set tree = p_tree, revision = revision + 1,
    updated_at = now(), updated_by = auth.uid()
  where symptom_id = p_symptom_id and revision = p_expected_revision
  returning * into v_row;
  if not found then
    raise exception '다른 관리자가 먼저 저장했습니다. 최신 내용을 확인한 뒤 다시 저장해주세요.' using errcode = '40001';
  end if;
  insert into public.diagnosis_tree_revisions(symptom_id, revision, tree, updated_at, updated_by)
  values(v_row.symptom_id, v_row.revision, v_row.tree, v_row.updated_at, v_row.updated_by);
  return v_row;
end;
$$;
revoke all on function public.save_diagnosis_tree(text, jsonb, integer) from public, anon;
grant execute on function public.save_diagnosis_tree(text, jsonb, integer) to authenticated;
commit;
