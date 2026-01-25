import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'

type DB = NodePgDatabase

/**
 * Seed data for the moc_instructions table
 *
 * Creates deterministic MOC data with fixed UUIDs for testing.
 * Idempotent via ON CONFLICT DO NOTHING - only inserts if record doesn't exist.
 *
 * STORY-011: MOC Instructions - Read Operations
 */
export async function seedMocs(db: DB) {
  console.log('  Seeding MOC instructions...')

  // Use the same user ID as AUTH_BYPASS dev user
  const devUserId = 'dev-user-00000000-0000-0000-0000-000000000001'

  // Second user for testing non-owner access
  const otherUserId = 'dev-user-00000000-0000-0000-0000-000000000002'

  // Fixed UUIDs for deterministic seeding
  const sampleMocs = [
    // Published MOC - visible to all
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0001',
      userId: devUserId,
      type: 'moc',
      mocId: 'MOC-12345',
      slug: 'kings-castle',
      title: "King's Castle",
      description: 'A majestic medieval castle with working drawbridge and detailed interior.',
      author: 'Test Builder',
      theme: 'Castle',
      partsCount: 2500,
      tags: ['castle', 'medieval', 'modular'],
      thumbnailUrl: 'https://example.com/kings-castle-thumb.jpg',
      status: 'published',
      publishedAt: new Date('2026-01-15'),
    },
    // Draft MOC - only visible to owner
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0002',
      userId: devUserId,
      type: 'moc',
      mocId: 'MOC-67890',
      slug: 'space-station',
      title: 'Orbital Space Station',
      description: 'A modular space station with docking bays and rotating sections.',
      author: 'Test Builder',
      theme: 'Space',
      partsCount: 1800,
      tags: ['space', 'sci-fi', 'modular'],
      thumbnailUrl: 'https://example.com/space-station-thumb.jpg',
      status: 'draft',
      publishedAt: null,
    },
    // Archived MOC - only visible to owner
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0003',
      userId: devUserId,
      type: 'moc',
      mocId: 'MOC-11111',
      slug: 'old-pirate-ship',
      title: 'Old Pirate Ship',
      description: 'An archived pirate ship design.',
      author: 'Test Builder',
      theme: 'Pirates',
      partsCount: 1200,
      tags: ['pirates', 'ship'],
      thumbnailUrl: 'https://example.com/pirate-ship-thumb.jpg',
      status: 'archived',
      publishedAt: null,
    },
    // Published MOC owned by other user - visible to all, not editable by dev user
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0004',
      userId: otherUserId,
      type: 'moc',
      mocId: 'MOC-99999',
      slug: 'technic-supercar',
      title: 'Technic Supercar',
      description: 'A detailed Technic supercar with working suspension.',
      author: 'Other Builder',
      theme: 'Technic',
      partsCount: 3000,
      tags: ['technic', 'car', 'motorized'],
      thumbnailUrl: 'https://example.com/supercar-thumb.jpg',
      status: 'published',
      publishedAt: new Date('2026-01-10'),
    },
    // Draft MOC owned by other user - NOT visible to dev user
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0005',
      userId: otherUserId,
      type: 'moc',
      mocId: 'MOC-88888',
      slug: 'secret-project',
      title: 'Secret Project',
      description: 'A secret project in development.',
      author: 'Other Builder',
      theme: 'City',
      partsCount: 500,
      tags: ['city', 'building'],
      thumbnailUrl: null,
      status: 'draft',
      publishedAt: null,
    },
    // Published set (not MOC) - for type discrimination testing
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0006',
      userId: devUserId,
      type: 'set',
      mocId: null,
      slug: 'lego-creator-castle',
      title: 'LEGO Creator 3-in-1 Castle',
      description: 'Official LEGO Creator set.',
      author: null,
      theme: 'Creator',
      partsCount: 1426,
      tags: ['creator', 'castle', '3-in-1'],
      thumbnailUrl: 'https://example.com/creator-castle-thumb.jpg',
      status: 'published',
      publishedAt: new Date('2026-01-01'),
    },
    // STORY-015: Test MOC with duplicate title (for 409 CONFLICT test)
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddd0015',
      userId: devUserId,
      type: 'moc',
      mocId: 'MOC-DUPLICATE',
      slug: 'test-moc-duplicate-title',
      title: 'Test MOC Duplicate Title',
      description: 'A MOC with a title used for duplicate testing.',
      author: 'Test Builder',
      theme: 'Test',
      partsCount: 100,
      tags: ['test', 'duplicate'],
      thumbnailUrl: null,
      status: 'published',
      publishedAt: new Date('2026-01-20'),
    },
    // STORY-015: Draft MOC owned by other user (for 403 FORBIDDEN test on finalize)
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001',
      userId: otherUserId,
      type: 'moc',
      mocId: 'MOC-OTHER-DRAFT',
      slug: 'other-user-draft-moc',
      title: 'Other User Draft MOC',
      description: 'A draft MOC owned by another user for ownership testing.',
      author: 'Other Builder',
      theme: 'Test',
      partsCount: 200,
      tags: ['test', 'ownership'],
      thumbnailUrl: null,
      status: 'draft',
      publishedAt: null,
    },
  ]

  for (const moc of sampleMocs) {
    await db.execute(sql`
      INSERT INTO moc_instructions (
        id, user_id, type, moc_id, slug, title, description, author, theme, parts_count,
        tags, thumbnail_url, status, published_at, created_at, updated_at
      ) VALUES (
        ${moc.id},
        ${moc.userId},
        ${moc.type},
        ${moc.mocId},
        ${moc.slug},
        ${moc.title},
        ${moc.description},
        ${moc.author},
        ${moc.theme},
        ${moc.partsCount},
        ${JSON.stringify(moc.tags)}::jsonb,
        ${moc.thumbnailUrl},
        ${moc.status},
        ${moc.publishedAt},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  console.log(`  ✓ Seeded ${sampleMocs.length} MOC instructions (skipped existing)`)

  // Seed MOC files
  console.log('  Seeding MOC files...')

  const sampleFiles = [
    // Files for King's Castle
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0001',
      fileType: 'instruction',
      fileUrl: 'https://example.com/kings-castle-instructions.pdf',
      originalFilename: 'kings-castle-instructions.pdf',
      mimeType: 'application/pdf',
    },
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0001',
      fileType: 'parts-list',
      fileUrl: 'https://example.com/kings-castle-parts.xml',
      originalFilename: 'kings-castle-parts.xml',
      mimeType: 'application/xml',
    },
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0003',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0001',
      fileType: 'thumbnail',
      fileUrl: 'https://example.com/kings-castle-thumb.jpg',
      originalFilename: 'kings-castle-thumb.jpg',
      mimeType: 'image/jpeg',
    },
    // Files for Space Station
    {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0004',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0002',
      fileType: 'instruction',
      fileUrl: 'https://example.com/space-station-instructions.pdf',
      originalFilename: 'space-station-instructions.pdf',
      mimeType: 'application/pdf',
    },
  ]

  for (const file of sampleFiles) {
    await db.execute(sql`
      INSERT INTO moc_files (
        id, moc_id, file_type, file_url, original_filename, mime_type, created_at
      ) VALUES (
        ${file.id},
        ${file.mocId},
        ${file.fileType},
        ${file.fileUrl},
        ${file.originalFilename},
        ${file.mimeType},
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  console.log(`  ✓ Seeded ${sampleFiles.length} MOC files (skipped existing)`)

  // STORY-012: Seed MOC Gallery Image Links
  console.log('  Seeding MOC gallery image links...')

  // MOC Gallery Images - links between moc_instructions and gallery_images
  // Per STORY-012 requirements:
  // - Link 1: King's Castle (dev user's MOC) + Castle Tower Photo (dev user's image) - happy path list test
  // - Link 2: King's Castle (dev user's MOC) + Medieval Knight (dev user's image) - multiple links test
  // - Link 3: Space Station (dev user's MOC) + Private Image (other user's image) - cross-user link test
  //
  // Available for POST link tests (NOT pre-linked):
  // - 22222222-... (Space Station Build)
  // - 66666666-... (Update Test Image)
  const mocGalleryImageLinks = [
    // Happy path list test - King's Castle + Castle Tower Photo
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0001',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0001', // King's Castle (dev user)
      galleryImageId: '11111111-1111-1111-1111-111111111111', // Castle Tower Photo (dev user)
    },
    // Multiple links test - King's Castle + Medieval Knight
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0002',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0001', // King's Castle (dev user)
      galleryImageId: '33333333-3333-3333-3333-333333333333', // Medieval Knight (dev user)
    },
    // Cross-user link test - Space Station (dev user's MOC) + Private Image (other user's image)
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccc0003',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0002', // Space Station (dev user, draft)
      galleryImageId: '55555555-5555-5555-5555-555555555555', // Private Image (other user)
    },
  ]

  for (const link of mocGalleryImageLinks) {
    await db.execute(sql`
      INSERT INTO moc_gallery_images (
        id, moc_id, gallery_image_id, created_at
      ) VALUES (
        ${link.id},
        ${link.mocId},
        ${link.galleryImageId},
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `)
  }

  console.log(
    `  ✓ Seeded ${mocGalleryImageLinks.length} MOC gallery image links (skipped existing)`,
  )
}
