import { glob } from 'glob'
import path from 'path'
import { logger } from '@repo/logger'
import { z } from 'zod'
import { parseFrontmatter } from './frontmatter-parser.js'

export const AgentMetadataSchema = z.object({
  name: z.string().min(1),
  agentType: z.string().min(1),
  permissionLevel: z.string().min(1),
  model: z.string().nullable(),
  spawnedBy: z.array(z.string()).nullable(),
  triggers: z.array(z.string()).nullable(),
  skillsUsed: z.array(z.string()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
})

export type AgentMetadata = z.infer<typeof AgentMetadataSchema>

export const CommandMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  triggers: z.array(z.string()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
})

export type CommandMetadata = z.infer<typeof CommandMetadataSchema>

export const SkillMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  capabilities: z.array(z.string()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
})

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>

/**
 * Extracts agent metadata from .agent.md files
 * @param agentFiles - Array of absolute paths to agent files
 * @returns Array of agent metadata objects
 */
export async function extractAgentMetadata(agentFiles: string[]): Promise<AgentMetadata[]> {
  const agents: AgentMetadata[] = []

  for (const filePath of agentFiles) {
    const result = await parseFrontmatter(filePath)
    if (!result) {
      continue
    }

    const { data } = result
    const frontmatter = data as Record<string, unknown>

    // Extract name from frontmatter or filename
    // Handle both .agent.md and .md extensions
    const basename = path.basename(filePath)
    const filename = basename.endsWith('.agent.md')
      ? basename.slice(0, -'.agent.md'.length)
      : path.basename(filePath, '.md')
    const name = (frontmatter.name as string) ?? filename

    // Extract required fields
    const agentType = frontmatter.type as string
    const permissionLevel = frontmatter.permission_level as string

    if (!agentType || !permissionLevel) {
      logger.warn('Agent missing required fields', {
        file: filePath,
        name,
        hasType: !!agentType,
        hasPermissionLevel: !!permissionLevel,
      })
      continue
    }

    // Extract optional fields
    const model = (frontmatter.model as string) ?? null
    const spawnedBy = Array.isArray(frontmatter.spawned_by)
      ? (frontmatter.spawned_by as string[])
      : null
    const triggers = Array.isArray(frontmatter.triggers)
      ? (frontmatter.triggers as string[])
      : null
    const skillsUsed = Array.isArray(frontmatter.skills_used)
      ? (frontmatter.skills_used as string[])
      : null

    // Extract remaining fields as metadata
    const metadata: Record<string, unknown> = {}
    const knownFields = new Set([
      'name',
      'type',
      'permission_level',
      'model',
      'spawned_by',
      'triggers',
      'skills_used',
    ])

    for (const [key, value] of Object.entries(frontmatter)) {
      if (!knownFields.has(key)) {
        metadata[key] = value
      }
    }

    agents.push({
      name,
      agentType,
      permissionLevel,
      model,
      spawnedBy,
      triggers,
      skillsUsed,
      metadata,
    })
  }

  logger.info('Extracted agent metadata', {
    total: agentFiles.length,
    successful: agents.length,
    failed: agentFiles.length - agents.length,
  })

  return agents
}

/**
 * Extracts command metadata from markdown files
 * @param commandFiles - Array of absolute paths to command files
 * @returns Array of command metadata objects
 */
export async function extractCommandMetadata(
  commandFiles: string[],
): Promise<CommandMetadata[]> {
  const commands: CommandMetadata[] = []

  for (const filePath of commandFiles) {
    const result = await parseFrontmatter(filePath)
    if (!result) {
      continue
    }

    const { data } = result
    const frontmatter = data as Record<string, unknown>

    // Extract name from frontmatter or filename
    const filename = path.basename(filePath, '.md')
    const name = (frontmatter.name as string) ?? filename

    // Extract optional fields
    const description = (frontmatter.description as string) ?? null
    const triggers = Array.isArray(frontmatter.triggers)
      ? (frontmatter.triggers as string[])
      : null

    // Extract remaining fields as metadata
    const metadata: Record<string, unknown> = {}
    const knownFields = new Set(['name', 'description', 'triggers'])

    for (const [key, value] of Object.entries(frontmatter)) {
      if (!knownFields.has(key)) {
        metadata[key] = value
      }
    }

    commands.push({
      name,
      description,
      triggers,
      metadata,
    })
  }

  logger.info('Extracted command metadata', {
    total: commandFiles.length,
    successful: commands.length,
    failed: commandFiles.length - commands.length,
  })

  return commands
}

/**
 * Extracts skill metadata from skill directories
 * @param skillDirs - Array of absolute paths to skill directories
 * @returns Array of skill metadata objects
 */
export async function extractSkillMetadata(skillDirs: string[]): Promise<SkillMetadata[]> {
  const skills: SkillMetadata[] = []

  for (const dirPath of skillDirs) {
    // Try to find skill.md or index.md in the directory
    const skillFiles = await glob('{skill.md,index.md}', { cwd: dirPath, absolute: true })

    if (skillFiles.length === 0) {
      logger.warn('No skill metadata file found', { directory: dirPath })
      continue
    }

    const filePath = skillFiles[0]
    const result = await parseFrontmatter(filePath)

    // Extract name from frontmatter or directory name
    const dirname = path.basename(dirPath)
    let name = dirname
    let description: string | null = null
    let capabilities: string[] | null = null
    let metadata: Record<string, unknown> = {}

    if (result) {
      const { data } = result
      const frontmatter = data as Record<string, unknown>

      name = (frontmatter.name as string) ?? dirname
      description = (frontmatter.description as string) ?? null
      capabilities = Array.isArray(frontmatter.capabilities)
        ? (frontmatter.capabilities as string[])
        : null

      // Extract remaining fields as metadata
      const knownFields = new Set(['name', 'description', 'capabilities'])

      for (const [key, value] of Object.entries(frontmatter)) {
        if (!knownFields.has(key)) {
          metadata[key] = value
        }
      }
    }

    skills.push({
      name,
      description,
      capabilities,
      metadata,
    })
  }

  logger.info('Extracted skill metadata', {
    total: skillDirs.length,
    successful: skills.length,
    failed: skillDirs.length - skills.length,
  })

  return skills
}
