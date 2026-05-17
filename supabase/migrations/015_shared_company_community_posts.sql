-- ============================================================
-- SHARED COMMUNITY POSTS FOR PEOPLE + COMPANIES
-- Company posts also appear in the normal community feed.
-- ============================================================

alter table posts
  add column if not exists company_id uuid references companies(id) on delete cascade,
  add column if not exists company_post_id uuid references company_posts(id) on delete set null,
  add column if not exists company_post_type text;

create unique index if not exists posts_company_post_id_unique
  on posts(company_post_id)
  where company_post_id is not null;

create index if not exists posts_company_created_idx
  on posts(company_id, created_at desc)
  where company_id is not null;

-- Backfill already-created company posts into the shared community feed.
insert into posts (
  id,
  user_id,
  company_id,
  company_post_id,
  company_post_type,
  content,
  media_urls,
  visibility,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  cp.author_id,
  cp.company_id,
  cp.id,
  cp.post_type,
  concat(
    case when cp.title is not null and cp.title <> '' then concat('<h3>', cp.title, '</h3>') else '' end,
    '<p>',
    replace(coalesce(cp.content, ''), E'\n', '<br>'),
    '</p>'
  ),
  coalesce(
    (
      select array_agg(image_url)
      from jsonb_array_elements_text(coalesce(cp.image_urls, '[]'::jsonb)) as images(image_url)
    ),
    '{}'::text[]
  ),
  'public',
  cp.created_at,
  cp.updated_at
from company_posts cp
where cp.is_published = true
  and not exists (
    select 1 from posts p where p.company_post_id = cp.id
  );

-- Tighten post writes so users can only attach a company they can post for.
drop policy if exists "Users can create own posts" on posts;
create policy "Users can create own posts"
  on posts for insert
  with check (
    auth.uid() = user_id
    and (
      company_id is null
      or has_company_permission(company_id, 'company.create_posts')
    )
  );

drop policy if exists "Users can update own posts" on posts;
create policy "Users can update own posts"
  on posts for update
  using (
    auth.uid() = user_id
    or (
      company_id is not null
      and has_company_permission(company_id, 'company.manage_posts')
    )
  );

drop policy if exists "Users can delete own posts" on posts;
create policy "Users can delete own posts"
  on posts for delete
  using (
    auth.uid() = user_id
    or (
      company_id is not null
      and has_company_permission(company_id, 'company.manage_posts')
    )
  );
