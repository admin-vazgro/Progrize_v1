-- Add avatar and cover photo columns to profiles
alter table profiles
  add column if not exists avatar_url text,
  add column if not exists cover_url text;

-- Create public storage bucket for profile media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- RLS: authenticated users can upload to their own folder
create policy "Users can upload own profile media"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: authenticated users can update/replace their own media
create policy "Users can update own profile media"
  on storage.objects for update
  using (
    bucket_id = 'profile-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: anyone can view profile media (public bucket)
create policy "Public profile media is viewable"
  on storage.objects for select
  using (bucket_id = 'profile-media');

-- RLS: users can delete their own media
create policy "Users can delete own profile media"
  on storage.objects for delete
  using (
    bucket_id = 'profile-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
