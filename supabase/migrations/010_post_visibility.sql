-- Add visibility to posts: public (everyone), network (connections only), private (author only)
alter table posts
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'network', 'private'));
