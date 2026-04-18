import {
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core'
import { sets } from './sets.js'

// ─────────────────────────────────────────────────────────────────────────────
// Minifig Archetypes — character identity (e.g., "Forestman", "Stormtrooper")
// ─────────────────────────────────────────────────────────────────────────────

export const minifigArchetypes = pgTable(
  'minifig_archetypes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index('minifig_archetypes_user_id_idx').on(table.userId),
    nameIdx: index('minifig_archetypes_name_idx').on(table.userId, table.name),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Minifig Variants — specific version of an archetype
// ─────────────────────────────────────────────────────────────────────────────

export const minifigVariants = pgTable(
  'minifig_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    archetypeId: uuid('archetype_id').references(() => minifigArchetypes.id, {
      onDelete: 'set null',
    }),
    name: text('name'),
    legoNumber: text('lego_number'),
    theme: text('theme'),
    subtheme: text('subtheme'),
    year: integer('year'),
    cmfSeries: text('cmf_series'),
    imageUrl: text('image_url'),
    weight: text('weight'),
    dimensions: text('dimensions'),
    partsCount: integer('parts_count'),
    parts: jsonb('parts').$type<
      Array<{
        partNumber: string
        name: string
        color: string
        quantity: number
        position?: string
      }>
    >(),
    appearsInSets: jsonb('appears_in_sets').$type<
      Array<{
        setNumber: string
        name: string
        imageUrl?: string
      }>
    >(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index('minifig_variants_user_id_idx').on(table.userId),
    archetypeIdIdx: index('minifig_variants_archetype_id_idx').on(table.archetypeId),
    legoNumberIdx: index('minifig_variants_lego_number_idx').on(table.legoNumber),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Minifig Instances — a specific physical minifig (one row per physical item)
// ─────────────────────────────────────────────────────────────────────────────

export const minifigInstances = pgTable(
  'minifig_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    variantId: uuid('variant_id').references(() => minifigVariants.id, { onDelete: 'set null' }),

    // Identity
    displayName: text('display_name').notNull(),

    // Status / Condition (separate concerns)
    status: text('status').notNull().default('none'), // 'none' | 'owned' | 'wanted'
    condition: text('condition'), // 'new_sealed' | 'built' | 'parted_out'

    // Source
    sourceType: text('source_type'), // 'set' | 'cmf_pack' | 'bricklink' | 'bulk_lot' | 'trade' | 'gift' | 'custom'
    sourceSetId: uuid('source_set_id').references(() => sets.id, { onDelete: 'set null' }),
    isCustom: boolean('is_custom').default(false).notNull(),

    // Purchase (embedded, matches sets pattern)
    purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
    purchaseTax: decimal('purchase_tax', { precision: 10, scale: 2 }),
    purchaseShipping: decimal('purchase_shipping', { precision: 10, scale: 2 }),
    purchaseDate: timestamp('purchase_date'),

    // Quantities
    quantityOwned: integer('quantity_owned').default(0).notNull(),
    quantityWanted: integer('quantity_wanted').default(0).notNull(),

    // Planning / Intent
    purpose: text('purpose'),
    plannedUse: text('planned_use'),
    notes: text('notes'),

    // Image
    imageUrl: text('image_url'),

    // Ordering
    sortOrder: integer('sort_order'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index('minifig_instances_user_id_idx').on(table.userId),
    userStatusIdx: index('minifig_instances_user_status_idx').on(table.userId, table.status),
    variantIdIdx: index('minifig_instances_variant_id_idx').on(table.variantId),
    sourceSetIdIdx: index('minifig_instances_source_set_id_idx').on(table.sourceSetId),
  }),
)
