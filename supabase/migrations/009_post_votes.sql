-- Add vote counts to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS downvote_count integer NOT NULL DEFAULT 0;

-- Track individual votes (value: 1 = upvote, -1 = downvote)
CREATE TABLE IF NOT EXISTS post_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (1, -1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_votes_post_id_idx ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS post_votes_user_id_idx ON post_votes(user_id);
