-- Add invite_token to rooms for private room invite links
alter table rooms add column if not exists invite_token uuid default gen_random_uuid() not null;

-- Backfill any existing rows that got null somehow
update rooms set invite_token = gen_random_uuid() where invite_token is null;
