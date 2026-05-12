-- ============================================================
-- RECRUITER FLOW — companies, job_postings, applications
-- Idempotent: safe to re-run after a partial failure
-- ============================================================

-- Add user_type to profiles
alter table profiles
  add column if not exists user_type text default 'jobseeker'
  check (user_type in ('jobseeker', 'recruiter'));

-- ============================================================
-- COMPANIES
-- ============================================================
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  domain text,
  logo_url text,
  website text,
  size text check (size in ('1-10','11-50','51-200','201-500','501-1000','1000+')),
  industry text,
  location text,
  description text,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table companies enable row level security;

drop policy if exists "Creator can manage company" on companies;
create policy "Creator can manage company"
  on companies for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop trigger if exists companies_updated_at on companies;
create trigger companies_updated_at before update on companies
  for each row execute function update_updated_at();

-- ============================================================
-- COMPANY MEMBERS
-- ============================================================
create table if not exists company_members (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'recruiter' check (role in ('admin', 'recruiter')),
  joined_at timestamptz default now() not null,
  unique (company_id, user_id)
);

alter table company_members enable row level security;

-- Security-definer function avoids infinite recursion when a policy on
-- company_members would otherwise query company_members itself.
create or replace function is_company_admin(cid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from company_members
    where company_id = cid
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "Members can read their own membership" on company_members;
create policy "Members can read their own membership"
  on company_members for select
  using (auth.uid() = user_id);

drop policy if exists "Company admins can manage members" on company_members;
create policy "Company admins can manage members"
  on company_members for all
  using (is_company_admin(company_id));

-- company_members now exists — safe to add cross-table policy on companies
drop policy if exists "Company members can read their company" on companies;
create policy "Company members can read their company"
  on companies for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from company_members cm
      where cm.company_id = companies.id and cm.user_id = auth.uid()
    )
  );

-- ============================================================
-- JOB POSTINGS
-- ============================================================
create table if not exists job_postings (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  recruiter_id uuid references auth.users(id) not null,
  title text not null,
  location text,
  work_mode text check (work_mode in ('remote','hybrid','onsite')),
  employment_type text check (employment_type in ('full-time','part-time','contract','freelance')),
  seniority text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text default 'USD',
  description text not null,
  requirements jsonb default '[]',
  required_skills jsonb default '[]',
  nice_to_have_skills jsonb default '[]',
  is_active boolean default true,
  posted_at timestamptz default now() not null,
  expires_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table job_postings enable row level security;

drop policy if exists "Recruiters can manage own job postings" on job_postings;
create policy "Recruiters can manage own job postings"
  on job_postings for all
  using (auth.uid() = recruiter_id)
  with check (auth.uid() = recruiter_id);

drop policy if exists "Authenticated users can read active postings" on job_postings;
create policy "Authenticated users can read active postings"
  on job_postings for select
  using (auth.role() = 'authenticated' and is_active = true);

drop trigger if exists job_postings_updated_at on job_postings;
create trigger job_postings_updated_at before update on job_postings
  for each row execute function update_updated_at();

-- ============================================================
-- APPLICATIONS
-- ============================================================
create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  job_posting_id uuid references job_postings(id) on delete cascade not null,
  applicant_id uuid references auth.users(id) on delete cascade not null,
  status text default 'applied'
    check (status in ('applied','reviewing','shortlisted','interview','offered','rejected')),
  fit_score numeric,
  ats_score numeric,
  cover_note text,
  recruiter_notes text,
  applied_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (job_posting_id, applicant_id)
);

alter table applications enable row level security;

drop policy if exists "Applicants can manage own applications" on applications;
create policy "Applicants can manage own applications"
  on applications for all
  using (auth.uid() = applicant_id)
  with check (auth.uid() = applicant_id);

drop policy if exists "Recruiters can view applications to their jobs" on applications;
create policy "Recruiters can view applications to their jobs"
  on applications for select
  using (
    exists (
      select 1 from job_postings jp
      where jp.id = applications.job_posting_id
        and jp.recruiter_id = auth.uid()
    )
  );

drop policy if exists "Recruiters can update application status and notes" on applications;
create policy "Recruiters can update application status and notes"
  on applications for update
  using (
    exists (
      select 1 from job_postings jp
      where jp.id = applications.job_posting_id
        and jp.recruiter_id = auth.uid()
    )
  );

drop trigger if exists applications_updated_at on applications;
create trigger applications_updated_at before update on applications
  for each row execute function update_updated_at();
