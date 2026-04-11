import { z } from 'zod'

export const MocOrderSchema = z.object({
  id: z.string(),
  storeName: z.string(),
  storeUrl: z.string().url().optional(),
  orderDate: z.string().datetime().or(z.string()),
  status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']),
  partsCount: z.number().int().nonnegative(),
  totalPrice: z.number().nonnegative().optional(),
  currency: z.string().min(1),
  trackingUrl: z.string().url().optional(),
})

export type MocOrder = z.infer<typeof MocOrderSchema>

export const MocGalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
})

export type MocGalleryImage = z.infer<typeof MocGalleryImageSchema>

export const MocPartsListSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  filename: z.string(),
})

export type MocPartsList = z.infer<typeof MocPartsListSchema>

export const MocAuthorSchema = z.object({
  displayName: z.string(),
  url: z.string().url().optional(),
})

export type MocAuthor = z.infer<typeof MocAuthorSchema>

export const MocSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  // Allow empty string for MOCs without a thumbnail yet
  coverImageUrl: z.string().url().or(z.literal('')),
  instructionsPdfUrls: z.array(z.string().url()),
  partsLists: z.array(MocPartsListSchema),
  galleryImages: z.array(MocGalleryImageSchema),
  updatedAt: z.string(),
  addedDate: z.string().optional(),
  publishedDate: z.string().optional(),
  purchasedDate: z.string().optional(),
  author: MocAuthorSchema.optional(),
  partsCount: z.number().int().nonnegative(),
  partsOwned: z.number().int().nonnegative().optional(),
  orders: z.array(MocOrderSchema).optional(),
  dimensions: z
    .object({
      height: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      width: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      depth: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      studsWidth: z.number().nullable().optional(),
      studsDepth: z.number().nullable().optional(),
      studsHeight: z.number().nullable().optional(),
      subBuilds: z
        .array(
          z.object({
            name: z.string(),
            height: z
              .object({
                cm: z.number().nullable().optional(),
                inches: z.number().nullable().optional(),
              })
              .nullable()
              .optional(),
            width: z
              .object({
                cm: z.number().nullable().optional(),
                inches: z.number().nullable().optional(),
              })
              .nullable()
              .optional(),
            depth: z
              .object({
                cm: z.number().nullable().optional(),
                inches: z.number().nullable().optional(),
              })
              .nullable()
              .optional(),
            studsWidth: z.number().nullable().optional(),
            studsDepth: z.number().nullable().optional(),
            studsHeight: z.number().nullable().optional(),
          }),
        )
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  ratings: z
    .object({
      overall: z.number().min(0).max(5).nullable().optional(),
      buildExperience: z.number().min(0).max(5).nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type Moc = z.infer<typeof MocSchema>
