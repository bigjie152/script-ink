CREATE TABLE IF NOT EXISTS script_issues (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS script_issues_script_id_idx ON script_issues(script_id);
CREATE INDEX IF NOT EXISTS script_issues_author_id_idx ON script_issues(author_id);
CREATE INDEX IF NOT EXISTS script_issues_status_idx ON script_issues(status);
