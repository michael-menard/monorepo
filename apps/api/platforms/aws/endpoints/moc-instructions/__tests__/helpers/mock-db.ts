import { vi } from 'vitest'
import { mocInstructions, galleryImages, mocGalleryImages, mocFiles } from '@/core/database/schema'

export type DbResolvers = {
  moc?: any[]
  galleryImage?: any[]
  mocGalleryLink?: any[]
  linkedImages?: any[]
  uploadsData?: any[]
  mocFile?: any[]
}

export function createDbMock(r: DbResolvers) {
  return {
    select: vi.fn(() => ({
      from: (table: any) => {
        if (table === mocInstructions) {
          return {
            where: (_: any) => ({
              limit: (_n: number) => Promise.resolve(r.moc ?? []),
              groupBy: (_: any) => ({
                orderBy: (_o: any) => Promise.resolve(r.uploadsData ?? []),
              }),
            }),
          }
        }
        if (table === galleryImages) {
          return {
            where: (_: any) => ({
              limit: (_n: number) => Promise.resolve(r.galleryImage ?? []),
            }),
          }
        }
        if (table === mocGalleryImages) {
          return {
            innerJoin: (_tbl: any, _on: any) => ({
              where: (_: any) => ({
                orderBy: (_o: any) => Promise.resolve(r.linkedImages ?? []),
              }),
            }),
            where: (_: any) => ({
              limit: (_n: number) => Promise.resolve(r.mocGalleryLink ?? []),
            }),
          }
        }
        if (table === mocFiles) {
          return {
            where: (_: any) => {
              const result = r.mocFile ?? []
              // Return an object that can be awaited (thenable) AND also supports chaining with .limit()
              return {
                limit: (_n: number) => Promise.resolve(result),
                then: (resolve: (v: any) => void) => resolve(result),
              } as any
            },
          }
        }
        return {
          where: (_: any) => ({ limit: (_n: number) => Promise.resolve([]) }),
          groupBy: (_: any) => ({ orderBy: (_o: any) => Promise.resolve([]) }),
        }
      },
    })),
    insert: vi.fn((_table: any) => ({
      values: (_vals: any) => ({ returning: () => Promise.resolve([{ id: 'link-id' }]) }),
    })),
    update: vi.fn((_table: any) => ({
      set: (_: any) => ({
        where: (_w: any) => ({ returning: () => Promise.resolve([{ id: 'updated-id' }]) }),
      }),
    })),
    delete: vi.fn((_table: any) => ({ where: (_w: any) => Promise.resolve() })),
  }
}

