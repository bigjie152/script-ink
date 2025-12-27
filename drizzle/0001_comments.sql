CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  parent_id TEXT,
  content TEXT NOT NULL,
  is_deleted INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_script_id_idx ON comments (script_id);
CREATE INDEX IF NOT EXISTS comments_author_id_idx ON comments (author_id);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON comment_likes (user_id);
