begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('diagnosis-media','diagnosis-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']) on conflict(id) do nothing;
drop policy if exists "Diagnosis media signed in read" on storage.objects;
create policy "Diagnosis media signed in read" on storage.objects for select to authenticated using(bucket_id='diagnosis-media');
drop policy if exists "Diagnosis media admin upload" on storage.objects;
create policy "Diagnosis media admin upload" on storage.objects for insert to authenticated with check(bucket_id='diagnosis-media' and public.is_admin() and (storage.foldername(name))[1]=auth.uid()::text);
commit;
