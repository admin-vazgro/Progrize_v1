-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  headline text,
  location text,
  email text,
  phone text,
  linkedin_url text,
  portfolio_url text,
  summary text,
  years_experience numeric,
  target_roles text[],
  target_locations text[],
  work_preferences jsonb,
  salary_preferences jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Users can manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- RESUME FILES
-- ============================================================
create table if not exists resume_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  parse_status text default 'pending' check (parse_status in ('pending','processing','completed','failed')),
  uploaded_at timestamptz default now() not null,
  parsed_at timestamptz
);

alter table resume_files enable row level security;

create policy "Users can manage own resume files"
  on resume_files for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- EXPERIENCE ITEMS
-- ============================================================
create table if not exists experience_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  company_name text not null,
  job_title text not null,
  start_date date,
  end_date date,
  is_current boolean default false,
  location text,
  description text,
  achievements jsonb,
  sort_order int,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table experience_items enable row level security;

create policy "Users can manage own experience"
  on experience_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- EDUCATION ITEMS
-- ============================================================
create table if not exists education_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table education_items enable row level security;

create policy "Users can manage own education"
  on education_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- CERTIFICATIONS
-- ============================================================
create table if not exists certifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  issuer text,
  issue_date date,
  expiration_date date,
  credential_id text,
  credential_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table certifications enable row level security;

create policy "Users can manage own certifications"
  on certifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- SKILLS (master catalog)
-- ============================================================
create table if not exists skills (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  category text,
  aliases text[],
  created_at timestamptz default now() not null
);

-- Skills are publicly readable (shared catalog)
alter table skills enable row level security;

create policy "Anyone can read skills"
  on skills for select using (true);

create policy "Authenticated users can insert skills"
  on skills for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- PROFILE SKILLS
-- ============================================================
create table if not exists profile_skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  skill_id uuid references skills(id) on delete cascade not null,
  level text check (level in ('beginner','intermediate','advanced','expert')),
  years_used numeric,
  evidence jsonb,
  created_at timestamptz default now() not null
);

alter table profile_skills enable row level security;

create policy "Users can manage own profile skills"
  on profile_skills for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- JOBS
-- ============================================================
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  external_job_id text,
  source_url text,
  company_name text not null,
  company_domain text,
  title text not null,
  location text,
  work_mode text check (work_mode in ('remote','hybrid','onsite','unknown')),
  employment_type text check (employment_type in ('full-time','part-time','contract','freelance','unknown')),
  seniority text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  description_raw text not null,
  description_clean text,
  requirements jsonb,
  responsibilities jsonb,
  benefits jsonb,
  posted_at timestamptz,
  ingested_at timestamptz default now() not null,
  expires_at timestamptz,
  is_active boolean default true
);

create unique index if not exists jobs_source_external_id on jobs (source, external_job_id)
  where external_job_id is not null;

-- Jobs are readable by all authenticated users
alter table jobs enable row level security;

create policy "Authenticated users can read jobs"
  on jobs for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert jobs"
  on jobs for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- JOB SKILLS
-- ============================================================
create table if not exists job_skills (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null,
  skill_id uuid references skills(id) on delete cascade not null,
  importance text,
  is_required boolean default false
);

alter table job_skills enable row level security;

create policy "Authenticated users can read job skills"
  on job_skills for select using (auth.role() = 'authenticated');

-- ============================================================
-- JOB MATCHES
-- ============================================================
create table if not exists job_matches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  fit_score numeric not null,
  ats_score numeric not null,
  skill_overlap_score numeric,
  experience_score numeric,
  title_similarity_score numeric,
  seniority_score numeric,
  location_score numeric,
  semantic_score numeric,
  missing_skills jsonb,
  missing_keywords jsonb,
  strengths jsonb,
  weaknesses jsonb,
  explanation jsonb,
  computed_at timestamptz default now() not null,
  unique (profile_id, job_id)
);

alter table job_matches enable row level security;

create policy "Users can manage own job matches"
  on job_matches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TAILORED RESUMES
-- ============================================================
create table if not exists tailored_resumes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete set null,
  source_resume_file_id uuid references resume_files(id) on delete set null,
  version_name text,
  content_json jsonb,
  exported_storage_path text,
  created_at timestamptz default now() not null
);

alter table tailored_resumes enable row level security;

create policy "Users can manage own tailored resumes"
  on tailored_resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- ANALYSIS TASKS
-- ============================================================
create table if not exists analysis_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_type text not null,
  input_payload jsonb,
  status text default 'pending' check (status in ('pending','processing','completed','failed')),
  output_payload jsonb,
  error_message text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table analysis_tasks enable row level security;

create policy "Users can manage own analysis tasks"
  on analysis_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or CLI)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);
-- insert into storage.buckets (id, name, public) values ('tailored-resumes', 'tailored-resumes', false);

-- Storage RLS (resumes bucket)
-- create policy "Users can upload own resumes" on storage.objects
--   for insert with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users can read own resumes" on storage.objects
--   for select using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users can delete own resumes" on storage.objects
--   for delete using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- HELPERS
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger experience_items_updated_at before update on experience_items
  for each row execute function update_updated_at();

create trigger education_items_updated_at before update on education_items
  for each row execute function update_updated_at();

create trigger certifications_updated_at before update on certifications
  for each row execute function update_updated_at();

create trigger analysis_tasks_updated_at before update on analysis_tasks
  for each row execute function update_updated_at();
