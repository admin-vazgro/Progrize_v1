-- Add profile projects for portfolio-style profile sections
create table if not exists profile_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text,
  project_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profile_projects enable row level security;

create policy "Users can manage own profile projects"
  on profile_projects for all
  using (auth.uid() = user_id);

create trigger profile_projects_updated_at before update on profile_projects
  for each row execute function update_updated_at();
