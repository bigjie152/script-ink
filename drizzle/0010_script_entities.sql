ALTER TABLE scripts ADD COLUMN is_migrated integer not null default 0;

CREATE TABLE script_entities (
  id text primary key not null,
  script_id text not null,
  type text not null,
  title text not null,
  content_json text not null,
  props_json text not null,
  created_at integer not null,
  updated_at integer not null
);

CREATE INDEX script_entities_script_id_idx ON script_entities (script_id);
CREATE INDEX script_entities_type_idx ON script_entities (type);
