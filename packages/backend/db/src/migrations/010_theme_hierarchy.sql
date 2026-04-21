-- 010_theme_hierarchy.sql
-- Replace flat tag_theme_mappings with a hierarchical theme taxonomy.
--
-- Hierarchy: themes self-reference via parent_id (adjacency list).
-- Tags attach to any theme node at any depth.
-- materialized_path stores the slash-delimited path for fast prefix queries
-- (e.g. 'Vehicles/Trains/Commuter') so the sunburst chart can render
-- N levels without recursive CTEs.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Hierarchical themes table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS theme_nodes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        NOT NULL,
  parent_id       uuid        REFERENCES theme_nodes(id) ON DELETE CASCADE,
  materialized_path text      NOT NULL DEFAULT '',
  depth           int         NOT NULL DEFAULT 0,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- A parent can only have one child with a given name
  UNIQUE (parent_id, slug)
);

-- Fast subtree lookups: "give me everything under Vehicles"
CREATE INDEX idx_theme_nodes_path ON theme_nodes USING btree (materialized_path text_pattern_ops);
CREATE INDEX idx_theme_nodes_parent ON theme_nodes (parent_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tag-to-theme-node mapping (many-to-many)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tag_theme_node_mappings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tag             text        NOT NULL,
  theme_node_id   uuid        NOT NULL REFERENCES theme_nodes(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tag, theme_node_id)
);

CREATE INDEX idx_tag_theme_node_tag ON tag_theme_node_mappings (tag);
CREATE INDEX idx_tag_theme_node_node ON tag_theme_node_mappings (theme_node_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger: auto-maintain materialized_path and depth on INSERT/UPDATE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_theme_node_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path text;
  parent_depth int;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.materialized_path := NEW.name;
    NEW.depth := 0;
  ELSE
    SELECT materialized_path, depth
      INTO parent_path, parent_depth
      FROM theme_nodes
     WHERE id = NEW.parent_id;

    NEW.materialized_path := parent_path || '/' || NEW.name;
    NEW.depth := parent_depth + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_theme_node_path
  BEFORE INSERT OR UPDATE OF parent_id, name
  ON theme_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_theme_node_path();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Migrate existing flat data into new tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Create root theme_nodes from distinct themes in the old table
INSERT INTO theme_nodes (name, slug, parent_id, sort_order)
SELECT DISTINCT
  theme,
  LOWER(REPLACE(REPLACE(theme, ' ', '-'), '''', '')),
  NULL,
  ROW_NUMBER() OVER (ORDER BY theme)
FROM tag_theme_mappings
ON CONFLICT DO NOTHING;

-- Map existing tags to their theme_node
INSERT INTO tag_theme_node_mappings (tag, theme_node_id)
SELECT ttm.tag, tn.id
FROM tag_theme_mappings ttm
JOIN theme_nodes tn ON tn.name = ttm.theme AND tn.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Keep old table for now (drop in a future migration after code cutover)
-- ─────────────────────────────────────────────────────────────────────────────

-- ALTER TABLE tag_theme_mappings RENAME TO tag_theme_mappings_deprecated;

COMMIT;
