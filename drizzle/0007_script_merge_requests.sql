CREATE TABLE IF NOT EXISTS script_merge_requests (
  id TEXT PRIMARY KEY,
  source_script_id TEXT NOT NULL,
  target_script_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS script_merge_requests_source_idx ON script_merge_requests(source_script_id);
CREATE INDEX IF NOT EXISTS script_merge_requests_target_idx ON script_merge_requests(target_script_id);
CREATE INDEX IF NOT EXISTS script_merge_requests_author_idx ON script_merge_requests(author_id);
CREATE INDEX IF NOT EXISTS script_merge_requests_status_idx ON script_merge_requests(status);
