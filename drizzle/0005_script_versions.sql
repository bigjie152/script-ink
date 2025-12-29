CREATE TABLE IF NOT EXISTS script_versions (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS script_versions_script_id_idx ON script_versions(script_id);
CREATE INDEX IF NOT EXISTS script_versions_author_id_idx ON script_versions(author_id);
