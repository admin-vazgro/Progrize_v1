-- ============================================================
-- MULTI-ROLE SUPPORT
-- Members can hold multiple roles simultaneously.
-- Permissions = union of all assigned roles' permissions.
-- The `role` column becomes the highest-privilege label (for RLS compat).
-- ============================================================

alter table company_members
  add column if not exists roles text[] default '{}'::text[] not null;

-- Backfill roles array from current single role
update company_members
  set roles = array[role]
  where roles = '{}'::text[] or array_length(roles, 1) is null;

-- Union permissions across an array of roles
create or replace function company_roles_permissions(member_roles text[])
returns text[]
language sql
immutable
as $$
  select coalesce(
    array(
      select distinct perm
      from unnest(member_roles) as r(role_name)
      cross join unnest(company_member_permissions(role_name)) as perm
      order by perm
    ),
    '{}'::text[]
  );
$$;

-- Updated sync: derive permissions from roles array; keep role as highest-privilege label
create or replace function sync_company_member_permissions()
returns trigger
language plpgsql
as $$
begin
  if array_length(new.roles, 1) > 0 then
    new.permissions = company_roles_permissions(new.roles);
    new.role = case
      when 'owner'     = any(new.roles) then 'owner'
      when 'admin'     = any(new.roles) then 'admin'
      when 'hr'        = any(new.roles) then 'hr'
      when 'recruiter' = any(new.roles) then 'recruiter'
      when 'social'    = any(new.roles) then 'social'
      else new.roles[1]
    end;
  else
    new.permissions = company_member_permissions(new.role);
    new.roles = array[new.role];
  end if;
  return new;
end;
$$;

-- Extend trigger to also fire on roles changes
drop trigger if exists company_members_sync_permissions on company_members;
create trigger company_members_sync_permissions
  before insert or update of role, roles on company_members
  for each row execute function sync_company_member_permissions();
