-- ============================================================
-- SOCIAL: follows, connections, notifications
-- ============================================================

-- Add social counters to profiles
alter table profiles add column if not exists follower_count   int default 0;
alter table profiles add column if not exists following_count  int default 0;
alter table profiles add column if not exists connection_count int default 0;

-- Add public read policy to profiles
drop policy if exists "Authenticated users can read all profiles" on profiles;
create policy "Authenticated users can read all profiles"
  on profiles for select using (auth.role() = 'authenticated');

-- ============================================================
-- FOLLOWS (unidirectional, no approval)
-- ============================================================
create table if not exists follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at   timestamptz default now() not null,
  unique(follower_id, following_id),
  check(follower_id <> following_id)
);

alter table follows enable row level security;

create policy "Authenticated users can read follows"
  on follows for select using (auth.role() = 'authenticated');

create policy "Users can manage own follows"
  on follows for all
  using  (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- ============================================================
-- CONNECTION REQUESTS
-- ============================================================
create table if not exists connection_requests (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  status       text default 'pending'
               check(status in ('pending','accepted','rejected','withdrawn')),
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  unique(sender_id, recipient_id),
  check(sender_id <> recipient_id)
);

alter table connection_requests enable row level security;

create policy "Users can view their own requests"
  on connection_requests for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send requests"
  on connection_requests for insert
  with check (auth.uid() = sender_id);

create policy "Users can update requests they are part of"
  on connection_requests for update
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can delete requests they are part of"
  on connection_requests for delete
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create trigger connection_requests_updated_at before update on connection_requests
  for each row execute function update_updated_at();

-- ============================================================
-- CONNECTIONS (accepted pairs, normalised user_id_a < user_id_b)
-- ============================================================
create table if not exists connections (
  id         uuid primary key default uuid_generate_v4(),
  user_id_a  uuid references auth.users(id) on delete cascade not null,
  user_id_b  uuid references auth.users(id) on delete cascade not null,
  request_id uuid references connection_requests(id) on delete set null,
  created_at timestamptz default now() not null,
  unique(user_id_a, user_id_b),
  check(user_id_a < user_id_b)
);

alter table connections enable row level security;

create policy "Authenticated users can read connections"
  on connections for select using (auth.role() = 'authenticated');

create policy "Users can manage own connections"
  on connections for all
  using (auth.uid() = user_id_a or auth.uid() = user_id_b);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  type       text not null
             check(type in ('connection_request','connection_accepted','follow','post_like','comment')),
  actor_id   uuid references auth.users(id) on delete cascade,
  entity_id  uuid,
  read       boolean default false,
  created_at timestamptz default now() not null
);

alter table notifications enable row level security;

create policy "Users can read own notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "Authenticated users can insert notifications"
  on notifications for insert with check (auth.role() = 'authenticated');

create policy "Users can update own notifications"
  on notifications for update using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists follows_follower_idx       on follows(follower_id);
create index if not exists follows_following_idx      on follows(following_id);
create index if not exists conn_req_recipient_idx     on connection_requests(recipient_id, status);
create index if not exists conn_req_sender_idx        on connection_requests(sender_id, status);
create index if not exists connections_a_idx          on connections(user_id_a);
create index if not exists connections_b_idx          on connections(user_id_b);
create index if not exists notifications_user_idx     on notifications(user_id, read, created_at desc);
create index if not exists posts_user_created_idx     on posts(user_id, created_at desc);
