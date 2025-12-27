CREATE TABLE IF NOT EXISTS script_likes (
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (script_id, user_id)
);

CREATE INDEX IF NOT EXISTS script_likes_script_id_idx ON script_likes(script_id);
CREATE INDEX IF NOT EXISTS script_likes_user_id_idx ON script_likes(user_id);
