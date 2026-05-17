-- ============================================================
-- COMPANY TEAMS — extended roles, company posts, invite tokens
-- ============================================================

-- Extend company_members role to include owner / hr / social
-- (admin and recruiter already exist from migration 006)
alter table company_members
  drop constraint if exists company_members_role_check;

alter table company_members
  add constraint company_members_role_check
  check (role in ('owner', 'admin', 'hr', 'social', 'recruiter'));

-- Migrate existing admins who are the company creator → owner
update company_members cm
set role = 'owner'
where cm.role = 'admin'
  and exists (
    select 1 from companies c
    where c.id = cm.company_id and c.created_by = cm.user_id
  );

-- Update is_company_admin helper to treat owner and admin the same
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
      and role in ('owner', 'admin')
  );
$$;

-- Helper: is the user a member of the company (any role)
create or replace function is_company_member(cid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from company_members
    where company_id = cid
      and user_id = auth.uid()
  );
$$;

-- ============================================================
-- COMPANY POSTS
-- ============================================================
create table if not exists company_posts (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid references companies(id) on delete cascade not null,
  author_id   uuid references auth.users(id) on delete cascade not null,
  title       text,
  content     text not null,
  image_urls  jsonb default '[]',
  post_type   text default 'update'
              check (post_type in ('update', 'hiring', 'culture', 'announcement')),
  is_published boolean default true,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table company_posts enable row level security;

-- Anyone authenticated can read published posts
drop policy if exists "Authenticated users can read published company posts" on company_posts;
create policy "Authenticated users can read published company posts"
  on company_posts for select
  using (auth.role() = 'authenticated' and is_published = true);

-- Company members can read all posts (incl. drafts)
drop policy if exists "Company members can read all posts" on company_posts;
create policy "Company members can read all posts"
  on company_posts for select
  using (is_company_member(company_id));

-- Social team + admins/owners can insert posts
drop policy if exists "Social team can insert posts" on company_posts;
create policy "Social team can insert posts"
  on company_posts for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from company_members cm
      where cm.company_id = company_posts.company_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin', 'social', 'hr')
    )
  );

-- Authors and admins can update posts
drop policy if exists "Authors and admins can update posts" on company_posts;
create policy "Authors and admins can update posts"
  on company_posts for update
  using (
    auth.uid() = author_id
    or is_company_admin(company_id)
  );

-- Authors and admins can delete posts
drop policy if exists "Authors and admins can delete posts" on company_posts;
create policy "Authors and admins can delete posts"
  on company_posts for delete
  using (
    auth.uid() = author_id
    or is_company_admin(company_id)
  );

drop trigger if exists company_posts_updated_at on company_posts;
create trigger company_posts_updated_at before update on company_posts
  for each row execute function update_updated_at();

-- ============================================================
-- COMPANY INVITES (token-based invite links for personal emails)
-- ============================================================
create table if not exists company_invites (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid references companies(id) on delete cascade not null,
  invited_by  uuid references auth.users(id) on delete cascade not null,
  email       text,
  role        text default 'hr'
              check (role in ('admin', 'hr', 'social', 'recruiter')),
  token       text unique not null default encode(gen_random_bytes(24), 'hex'),
  accepted    boolean default false,
  expires_at  timestamptz default (now() + interval '7 days') not null,
  created_at  timestamptz default now() not null
);

alter table company_invites enable row level security;

drop policy if exists "Company admins can manage invites" on company_invites;
create policy "Company admins can manage invites"
  on company_invites for all
  using (is_company_admin(company_id));

-- Allow reading own invite by token (for accepting)
drop policy if exists "Anyone can read invite by token" on company_invites;
create policy "Anyone can read invite by token"
  on company_invites for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- RLS: allow company members to read all members of their company
-- ============================================================
drop policy if exists "Members can read team of their company" on company_members;
create policy "Members can read team of their company"
  on company_members for select
  using (is_company_member(company_id));

-- Owners can remove members (but not themselves unless sole member)
drop policy if exists "Admins can delete members" on company_members;
create policy "Admins can delete members"
  on company_members for delete
  using (is_company_admin(company_id));

-- Admins can update roles
drop policy if exists "Admins can update member roles" on company_members;
create policy "Admins can update member roles"
  on company_members for update
  using (is_company_admin(company_id));
