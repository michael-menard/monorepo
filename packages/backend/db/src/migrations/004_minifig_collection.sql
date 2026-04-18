-- Minifig Collection tables

CREATE TABLE IF NOT EXISTS minifig_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS minifig_archetypes_user_id_idx ON minifig_archetypes (user_id);
CREATE INDEX IF NOT EXISTS minifig_archetypes_name_idx ON minifig_archetypes (user_id, name);

CREATE TABLE IF NOT EXISTS minifig_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  archetype_id UUID REFERENCES minifig_archetypes(id) ON DELETE SET NULL,
  name TEXT,
  lego_number TEXT,
  theme TEXT,
  subtheme TEXT,
  year INTEGER,
  cmf_series TEXT,
  image_url TEXT,
  weight TEXT,
  dimensions TEXT,
  parts_count INTEGER,
  parts JSONB,
  appears_in_sets JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS minifig_variants_user_id_idx ON minifig_variants (user_id);
CREATE INDEX IF NOT EXISTS minifig_variants_archetype_id_idx ON minifig_variants (archetype_id);
CREATE INDEX IF NOT EXISTS minifig_variants_lego_number_idx ON minifig_variants (lego_number);

CREATE TABLE IF NOT EXISTS minifig_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  variant_id UUID REFERENCES minifig_variants(id) ON DELETE SET NULL,

  display_name TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'none',
  condition TEXT,

  source_type TEXT,
  source_set_id UUID REFERENCES sets(id) ON DELETE SET NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,

  purchase_price DECIMAL(10,2),
  purchase_tax DECIMAL(10,2),
  purchase_shipping DECIMAL(10,2),
  purchase_date TIMESTAMP,

  purpose TEXT,
  planned_use TEXT,
  notes TEXT,

  image_url TEXT,
  sort_order INTEGER,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS minifig_instances_user_id_idx ON minifig_instances (user_id);
CREATE INDEX IF NOT EXISTS minifig_instances_user_status_idx ON minifig_instances (user_id, status);
CREATE INDEX IF NOT EXISTS minifig_instances_variant_id_idx ON minifig_instances (variant_id);
CREATE INDEX IF NOT EXISTS minifig_instances_source_set_id_idx ON minifig_instances (source_set_id);
