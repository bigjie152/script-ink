CREATE TABLE IF NOT EXISTS script_favorites (
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (script_id, user_id)
);
CREATE INDEX IF NOT EXISTS script_favorites_script_id_idx ON script_favorites (script_id);
CREATE INDEX IF NOT EXISTS script_favorites_user_id_idx ON script_favorites (user_id);

CREATE TABLE IF NOT EXISTS script_bookmarks (
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (script_id, user_id)
);
CREATE INDEX IF NOT EXISTS script_bookmarks_script_id_idx ON script_bookmarks (script_id);
CREATE INDEX IF NOT EXISTS script_bookmarks_user_id_idx ON script_bookmarks (user_id);
