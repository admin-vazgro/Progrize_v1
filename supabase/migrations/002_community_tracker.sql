-- ============================================================
-- USER PREFERENCES (community interests for personalised feed)
-- ============================================================
create table if not exists user_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  industries text[] default '{}',
  topics text[] default '{}',
  job_roles text[] default '{}',
  career_goals text[] default '{}',
  onboarding_completed boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table user_preferences enable row level security;

create policy "Users can manage own preferences"
  on user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger user_preferences_updated_at before update on user_preferences
  for each row execute function update_updated_at();

-- ============================================================
-- ROOMS
-- ============================================================
create table if not exists rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  is_private boolean default false,
  creator_id uuid references auth.users(id) on delete set null,
  member_count int default 0,
  post_count int default 0,
  rules text,
  cover_image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table rooms enable row level security;

create policy "Anyone can read public rooms"
  on rooms for select using (not is_private or auth.role() = 'authenticated');

create policy "Authenticated users can create rooms"
  on rooms for insert with check (auth.role() = 'authenticated');

create policy "Room creators can update rooms"
  on rooms for update using (auth.uid() = creator_id);

create trigger rooms_updated_at before update on rooms
  for each row execute function update_updated_at();

-- ============================================================
-- ROOM MEMBERS
-- ============================================================
create table if not exists room_members (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'moderator', 'member')),
  joined_at timestamptz default now() not null,
  unique (room_id, user_id)
);

alter table room_members enable row level security;

create policy "Anyone can read room members"
  on room_members for select using (auth.role() = 'authenticated');

create policy "Users can join/leave rooms"
  on room_members for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  room_id uuid references rooms(id) on delete cascade,
  content text not null,
  media_urls text[] default '{}',
  reshared_post_id uuid references posts(id) on delete set null,
  like_count int default 0,
  comment_count int default 0,
  reshare_count int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table posts enable row level security;

create policy "Anyone authenticated can read posts"
  on posts for select using (auth.role() = 'authenticated');

create policy "Users can create own posts"
  on posts for insert with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on posts for update using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on posts for delete using (auth.uid() = user_id);

create trigger posts_updated_at before update on posts
  for each row execute function update_updated_at();

-- ============================================================
-- POST LIKES
-- ============================================================
create table if not exists post_likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (post_id, user_id)
);

alter table post_likes enable row level security;

create policy "Authenticated users can manage post likes"
  on post_likes for all
  using (auth.role() = 'authenticated')
  with check (auth.uid() = user_id);

-- ============================================================
-- POST COMMENTS
-- ============================================================
create table if not exists post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table post_comments enable row level security;

create policy "Authenticated users can read comments"
  on post_comments for select using (auth.role() = 'authenticated');

create policy "Users can create own comments"
  on post_comments for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on post_comments for delete using (auth.uid() = user_id);

create trigger post_comments_updated_at before update on post_comments
  for each row execute function update_updated_at();

-- ============================================================
-- JOB APPLICATIONS (tracker)
-- ============================================================
create table if not exists job_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_title text not null,
  company_name text not null,
  source_url text,
  location text,
  salary_range text,
  notes text,
  status text default 'saved' check (status in ('saved','applied','interviewing','offer','rejected')),
  applied_at timestamptz,
  sort_order int default 0,
  external_job_id text,
  job_analysis_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table job_applications enable row level security;

create policy "Users can manage own job applications"
  on job_applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger job_applications_updated_at before update on job_applications
  for each row execute function update_updated_at();

-- ============================================================
-- SEED: default rooms
-- ============================================================
insert into rooms (id, name, slug, description, is_private) values
  (uuid_generate_v4(), 'Tech & Engineering', 'tech-engineering', 'Discussions about software, engineering, and tech careers', false),
  (uuid_generate_v4(), 'Product & Design', 'product-design', 'For product managers, designers, and UX professionals', false),
  (uuid_generate_v4(), 'Career Advice', 'career-advice', 'Share tips, ask questions, and support each other''s career journey', false),
  (uuid_generate_v4(), 'Job Hunting', 'job-hunting', 'Tips, strategies, and support for finding your next role', false),
  (uuid_generate_v4(), 'Interview Prep', 'interview-prep', 'Practice, resources, and advice for interviews', false)
on conflict (slug) do nothing;
