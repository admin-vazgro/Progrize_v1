-- ============================================================
-- COMPANY ACCOUNTS + MEMBER PERMISSIONS
-- Companies are first-class accounts/entities.
-- Normal user profiles act on behalf of a company through memberships.
-- ============================================================

alter table companies
  add column if not exists account_type text default 'company'
    check (account_type in ('company')),
  add column if not exists follower_count int default 0;

alter table company_members
  add column if not exists permissions text[] default '{}'::text[] not null;

-- Backfill permissions from the current role model.
-- This keeps existing role-based flows working while making explicit actions available.
update company_members
set permissions = case role
  when 'owner' then array[
    'company.manage_profile',
    'company.manage_members',
    'company.manage_teams',
    'company.create_posts',
    'company.manage_posts',
    'company.create_jobs',
    'company.manage_recruitments',
    'company.view_pipeline'
  ]
  when 'admin' then array[
    'company.manage_profile',
    'company.manage_members',
    'company.manage_teams',
    'company.create_posts',
    'company.manage_posts',
    'company.create_jobs',
    'company.manage_recruitments',
    'company.view_pipeline'
  ]
  when 'hr' then array[
    'company.create_jobs',
    'company.manage_recruitments',
    'company.view_pipeline',
    'company.create_posts'
  ]
  when 'social' then array[
    'company.create_posts',
    'company.manage_posts'
  ]
  when 'recruiter' then array[
    'company.create_jobs',
    'company.manage_recruitments',
    'company.view_pipeline'
  ]
  else '{}'::text[]
end
where permissions = '{}'::text[];

create or replace function company_member_permissions(member_role text)
returns text[]
language sql
immutable
as $$
  select case member_role
    when 'owner' then array[
      'company.manage_profile',
      'company.manage_members',
      'company.manage_teams',
      'company.create_posts',
      'company.manage_posts',
      'company.create_jobs',
      'company.manage_recruitments',
      'company.view_pipeline'
    ]
    when 'admin' then array[
      'company.manage_profile',
      'company.manage_members',
      'company.manage_teams',
      'company.create_posts',
      'company.manage_posts',
      'company.create_jobs',
      'company.manage_recruitments',
      'company.view_pipeline'
    ]
    when 'hr' then array[
      'company.create_jobs',
      'company.manage_recruitments',
      'company.view_pipeline',
      'company.create_posts'
    ]
    when 'social' then array[
      'company.create_posts',
      'company.manage_posts'
    ]
    when 'recruiter' then array[
      'company.create_jobs',
      'company.manage_recruitments',
      'company.view_pipeline'
    ]
    else '{}'::text[]
  end;
$$;

create or replace function has_company_permission(cid uuid, permission text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from company_members
    where company_id = cid
      and user_id = auth.uid()
      and (
        role in ('owner', 'admin')
        or permission = any(permissions)
      )
  );
$$;

-- Keep permissions in sync when a role changes unless custom permissions are provided.
create or replace function sync_company_member_permissions()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT'
    or new.permissions is null
    or new.permissions = '{}'::text[]
    or new.role is distinct from old.role
  then
    new.permissions = company_member_permissions(new.role);
  end if;
  return new;
end;
$$;

drop trigger if exists company_members_sync_permissions on company_members;
create trigger company_members_sync_permissions before insert or update of role on company_members
  for each row execute function sync_company_member_permissions();

-- Permission-aware post policies.
drop policy if exists "Social team can insert posts" on company_posts;
create policy "Social team can insert posts"
  on company_posts for insert
  with check (
    auth.uid() = author_id
    and has_company_permission(company_id, 'company.create_posts')
  );

drop policy if exists "Authors and admins can update posts" on company_posts;
create policy "Authors and admins can update posts"
  on company_posts for update
  using (
    auth.uid() = author_id
    or has_company_permission(company_id, 'company.manage_posts')
  );

drop policy if exists "Authors and admins can delete posts" on company_posts;
create policy "Authors and admins can delete posts"
  on company_posts for delete
  using (
    auth.uid() = author_id
    or has_company_permission(company_id, 'company.manage_posts')
  );

drop policy if exists "Admins can delete members" on company_members;
create policy "Admins can delete members"
  on company_members for delete
  using (has_company_permission(company_id, 'company.manage_members'));

drop policy if exists "Admins can update member roles" on company_members;
create policy "Admins can update member roles"
  on company_members for update
  using (has_company_permission(company_id, 'company.manage_members'));
