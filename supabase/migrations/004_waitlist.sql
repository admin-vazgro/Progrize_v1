create table if not exists waitlist (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  created_at timestamptz default now() not null,
  constraint waitlist_email_unique unique (email)
);

alter table waitlist enable row level security;

-- Allow anyone to insert (public sign-up)
create policy "Anyone can join waitlist"
  on waitlist for insert
  with check (true);
