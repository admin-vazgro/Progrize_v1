-- Add type and domain to companies
alter table companies
  add column if not exists type text not null default 'employer'
    check (type in ('employer', 'agency')),
  add column if not exists domain text;

-- Add verification method to company_members
alter table company_members
  add column if not exists verified_by text not null default 'manual'
    check (verified_by in ('domain', 'invite', 'manual'));
