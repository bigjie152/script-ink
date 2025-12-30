ALTER TABLE scripts ADD COLUMN deleted_at INTEGER;

CREATE TABLE script_archives (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX script_archives_script_id_idx ON script_archives (script_id);
