CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  cover_url TEXT,
  is_public INTEGER NOT NULL,
  allow_fork INTEGER NOT NULL,
  root_id TEXT,
  parent_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scripts_author_id_idx ON scripts (author_id);
CREATE INDEX IF NOT EXISTS scripts_root_id_idx ON scripts (root_id);

CREATE TABLE IF NOT EXISTS script_sections (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  section_type TEXT NOT NULL,
  content_md TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS script_sections_script_id_idx ON script_sections (script_id);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content_md TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS roles_script_id_idx ON roles (script_id);

CREATE TABLE IF NOT EXISTS clues (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS clues_script_id_idx ON clues (script_id);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tags_name_unique ON tags (name);

CREATE TABLE IF NOT EXISTS script_tags (
  script_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (script_id, tag_id)
);
CREATE INDEX IF NOT EXISTS script_tags_script_id_idx ON script_tags (script_id);
CREATE INDEX IF NOT EXISTS script_tags_tag_id_idx ON script_tags (tag_id);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  logic_score INTEGER NOT NULL,
  prose_score INTEGER NOT NULL,
  trick_score INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ratings_user_id_idx ON ratings (user_id);
CREATE INDEX IF NOT EXISTS ratings_script_id_idx ON ratings (script_id);
CREATE UNIQUE INDEX IF NOT EXISTS ratings_user_script_unique ON ratings (user_id, script_id);
