/**
 * Parsers for Knowledge Base Seeding
 *
 * This module exports parsers for extracting knowledge entries from:
 * - YAML seed data files (seed-data.yaml)
 * - LESSONS-LEARNED.md markdown files
 *
 * @see KNOW-006 for implementation details and acceptance criteria
 *
 * @example
 * ```typescript
 * import {
 *   parseSeedYaml,
 *   parseLessonsLearned,
 *   type ParsedEntry,
 * } from './parsers'
 *
 * // Parse YAML seed data
 * const yamlResult = parseSeedYaml(yamlContent, 'seed-data.yaml')
 *
 * // Parse LESSONS-LEARNED.md
 * const mdResult = parseLessonsLearned(markdownContent, 'LESSONS-LEARNED.md')
 * ```
 */

// YAML parser
export { parseSeedYaml, parseSeedYamlSimple } from './parse-seed-yaml.js'

// Markdown parser
export { parseLessonsLearned, parseLessonsLearnedSimple } from './parse-lessons-learned.js'

// Types and schemas
export {
  // Schemas
  ParsedEntrySchema,
  YamlSeedEntrySchema,
  YamlParseResultSchema,
  MarkdownParseResultSchema,
  TagSchema,
  ParsedRoleSchema,
  // Types
  type ParsedEntry,
  type YamlSeedEntry,
  type YamlParseResult,
  type MarkdownParseResult,
  type ParsedRole,
  // Errors
  YamlParseError,
  ValidationError,
  DuplicateIdError,
  FileSizeLimitError,
  // Utilities
  sanitizeContent,
  validateFileSize,
  validateTag,
  // Constants
  MAX_FILE_SIZE_BYTES,
  MAX_TAGS_PER_ENTRY,
  MAX_TAG_LENGTH,
  TAG_FORMAT_REGEX,
} from './__types__/index.js'
