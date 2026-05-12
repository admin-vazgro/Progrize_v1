-- ============================================================
-- Fix company_members self-insert policies
-- The existing "Company admins can manage members" policy uses
-- is_company_admin() which returns false when inserting the
-- very first row (chicken-and-egg). We need two targeted
-- self-insert policies to cover the two onboarding actions.
-- ============================================================

-- Allow a user to add themselves as admin for a company they created
drop policy if exists "Company creator can add self as admin" on company_members;
create policy "Company creator can add self as admin"
  on company_members for insert
  with check (
    auth.uid() = user_id
    and role = 'admin'
    and exists (
      select 1 from companies c
      where c.id = company_id and c.created_by = auth.uid()
    )
  );

-- Allow any authenticated user to add themselves as recruiter (join flow)
drop policy if exists "Users can join company as recruiter" on company_members;
create policy "Users can join company as recruiter"
  on company_members for insert
  with check (
    auth.uid() = user_id
    and role = 'recruiter'
  );
