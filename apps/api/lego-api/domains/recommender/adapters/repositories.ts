import { eq, and, isNull } from 'drizzle-orm'
import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as dbSchema from '@repo/db'
import type { BuildProject, BuildProjectWithParts, CreateBuildProjectInput } from '../types.js'
import type { BuildProjectRepository } from '../ports/index.js'

type DB = NodePgDatabase<typeof dbSchema>
type Schema = typeof dbSchema

export function createBuildProjectRepository(db: DB, schema: Schema): BuildProjectRepository {
  return {
    async findById(id: string): Promise<Result<BuildProjectWithParts, 'NOT_FOUND'>> {
      const project = await db.query.buildProjects.findFirst({
        where: eq(schema.buildProjects.id, id),
        with: {
          parts: true,
        },
      })

      if (!project) return err('NOT_FOUND')

      return ok({
        id: project.id,
        userId: project.userId,
        name: project.name,
        concept: project.concept,
        searchSignals: project.searchSignals as BuildProject['searchSignals'],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        parts: project.parts.map(p => ({
          id: p.id,
          projectId: p.projectId,
          partNumber: p.partNumber,
          color: p.color,
          quantity: p.quantity,
          source: p.source as 'collection' | 'wishlist' | 'external',
          explanation: p.explanation,
          createdAt: p.createdAt,
        })),
      })
    },

    async findByUserId(userId: string): Promise<BuildProject[]> {
      const projects = await db
        .select()
        .from(schema.buildProjects)
        .where(eq(schema.buildProjects.userId, userId))
        .orderBy(schema.buildProjects.createdAt)

      return projects.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        concept: p.concept,
        searchSignals: p.searchSignals as BuildProject['searchSignals'],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    },

    async insert(userId: string, input: CreateBuildProjectInput): Promise<BuildProjectWithParts> {
      const [project] = await db
        .insert(schema.buildProjects)
        .values({
          userId,
          name: input.name,
          concept: input.concept,
          searchSignals: input.searchSignals ?? null,
        })
        .returning()

      const parts =
        input.parts.length > 0
          ? await db
              .insert(schema.buildProjectParts)
              .values(
                input.parts.map(p => ({
                  projectId: project.id,
                  partNumber: p.partNumber,
                  color: p.color,
                  quantity: p.quantity ?? 1,
                  source: p.source,
                  explanation: p.explanation ?? null,
                })),
              )
              .returning()
          : []

      return {
        id: project.id,
        userId: project.userId,
        name: project.name,
        concept: project.concept,
        searchSignals: project.searchSignals as BuildProject['searchSignals'],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        parts: parts.map(p => ({
          id: p.id,
          projectId: p.projectId,
          partNumber: p.partNumber,
          color: p.color,
          quantity: p.quantity,
          source: p.source as 'collection' | 'wishlist' | 'external',
          explanation: p.explanation,
          createdAt: p.createdAt,
        })),
      }
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db
        .delete(schema.buildProjects)
        .where(eq(schema.buildProjects.id, id))
        .returning({ id: schema.buildProjects.id })

      if (result.length === 0) return err('NOT_FOUND')
      return ok(undefined)
    },
  }
}
