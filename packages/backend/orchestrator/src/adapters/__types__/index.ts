/**
 * Type Definitions and Custom Errors for Story File Adapter
 *
 * This module provides type-safe error classes for story file operations.
 * All errors extend the base Error class with additional context.
 */

/**
 * Base class for all story file adapter errors
 */
export class StoryFileAdapterError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace?.(this, this.constructor)
  }
}

/**
 * Thrown when a story file is not found at the specified path
 *
 * @example
 * ```typescript
 * throw new StoryNotFoundError('/path/to/story.yaml')
 * ```
 */
export class StoryNotFoundError extends StoryFileAdapterError {
  constructor(public readonly filePath: string) {
    super(`Story file not found: ${filePath}`, { filePath })
    this.name = 'StoryNotFoundError'
  }
}

/**
 * Thrown when a checkpoint file is not found at the specified path
 *
 * @example
 * ```typescript
 * throw new CheckpointNotFoundError('/path/to/CHECKPOINT.yaml')
 * ```
 */
export class CheckpointNotFoundError extends StoryFileAdapterError {
  constructor(public readonly filePath: string) {
    super(`Checkpoint file not found: ${filePath}`, { filePath })
    this.name = 'CheckpointNotFoundError'
  }
}

/**
 * Thrown when YAML parsing fails (malformed YAML syntax)
 *
 * @example
 * ```typescript
 * throw new InvalidYAMLError('/path/to/story.yaml', parseError)
 * ```
 */
export class InvalidYAMLError extends StoryFileAdapterError {
  constructor(
    public readonly filePath: string,
    public readonly cause: Error,
  ) {
    super(`Invalid YAML in file: ${filePath}. ${cause.message}`, {
      filePath,
      originalError: cause.message,
    })
    this.name = 'InvalidYAMLError'
    this.cause = cause
  }
}

/**
 * Thrown when story file content fails Zod schema validation
 *
 * @example
 * ```typescript
 * throw new ValidationError('/path/to/story.yaml', zodError)
 * ```
 */
export class ValidationError extends StoryFileAdapterError {
  constructor(
    public readonly filePath: string,
    public readonly validationErrors: Array<{ path: string[]; message: string }>,
  ) {
    const errorSummary = validationErrors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
    super(`Validation failed for file: ${filePath}. ${errorSummary}`, {
      filePath,
      validationErrors,
    })
    this.name = 'ValidationError'
  }
}

/**
 * Thrown when writing to a story file fails
 *
 * @example
 * ```typescript
 * throw new WriteError('/path/to/story.yaml', fsError)
 * ```
 */
export class WriteError extends StoryFileAdapterError {
  constructor(
    public readonly filePath: string,
    public readonly cause: Error,
  ) {
    super(`Failed to write file: ${filePath}. ${cause.message}`, {
      filePath,
      originalError: cause.message,
    })
    this.name = 'WriteError'
    this.cause = cause
  }
}

/**
 * Thrown when reading from a story file fails (other than file not found)
 *
 * @example
 * ```typescript
 * throw new ReadError('/path/to/story.yaml', permissionError)
 * ```
 */
export class ReadError extends StoryFileAdapterError {
  constructor(
    public readonly filePath: string,
    public readonly cause: Error,
  ) {
    super(`Failed to read file: ${filePath}. ${cause.message}`, {
      filePath,
      originalError: cause.message,
    })
    this.name = 'ReadError'
    this.cause = cause
  }
}
/**
 * Base class for index adapter errors
 */
export class IndexAdapterError extends StoryFileAdapterError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context)
    this.name = 'IndexAdapterError'
  }
}

/**
 * Thrown when index structure is invalid
 *
 * @example
 * ```typescript
 * throw new InvalidIndexError(indexPath, errors)
 * ```
 */
export class InvalidIndexError extends IndexAdapterError {
  constructor(
    public readonly indexPath: string,
    public readonly errors: Array<{ type: string; message: string }>,
  ) {
    super(`Invalid index structure: ${indexPath}`, { indexPath, errors })
    this.name = 'InvalidIndexError'
  }
}

/**
 * Thrown when circular dependencies are detected
 *
 * @example
 * ```typescript
 * throw new CircularDependencyError(['STORY-A', 'STORY-B', 'STORY-A'])
 * ```
 */
export class CircularDependencyError extends IndexAdapterError {
  constructor(public readonly cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' -> ')}`, { cycle })
    this.name = 'CircularDependencyError'
  }
}

/**
 * Thrown when duplicate story IDs are found
 *
 * @example
 * ```typescript
 * throw new DuplicateStoryIdError('STORY-001')
 * ```
 */
export class DuplicateStoryIdError extends IndexAdapterError {
  constructor(public readonly storyId: string) {
    super(`Duplicate story ID: ${storyId}`, { storyId })
    this.name = 'DuplicateStoryIdError'
  }
}

/**
 * Thrown when a story is not found in the index
 *
 * @example
 * ```typescript
 * throw new StoryNotInIndexError('STORY-001', '/path/to/index.md')
 * ```
 */
export class StoryNotInIndexError extends IndexAdapterError {
  constructor(
    public readonly storyId: string,
    public readonly indexPath: string,
  ) {
    super(`Story not found in index: ${storyId}`, { storyId, indexPath })
    this.name = 'StoryNotInIndexError'
  }
}

/**
 * Base class for stage movement errors
 */
export class StageMovementError extends StoryFileAdapterError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context)
    this.name = 'StageMovementError'
  }
}

/**
 * Thrown when an invalid stage name is provided
 *
 * @example
 * ```typescript
 * throw new InvalidStageError('invalid-stage', ['backlog', 'in-progress'])
 * ```
 */
export class InvalidStageError extends StageMovementError {
  constructor(
    public readonly stage: string,
    public readonly validStages: string[],
  ) {
    super(`Invalid stage: ${stage}. Valid stages: ${validStages.join(', ')}`, {
      stage,
      validStages,
    })
    this.name = 'InvalidStageError'
  }
}

/**
 * Thrown when a stage transition is not allowed by the DAG
 *
 * @example
 * ```typescript
 * throw new InvalidTransitionError('uat', 'backlog', 'Transition not allowed')
 * ```
 */
export class InvalidTransitionError extends StageMovementError {
  constructor(
    public readonly fromStage: string,
    public readonly toStage: string,
    public readonly reason: string,
  ) {
    super(`Invalid transition from ${fromStage} to ${toStage}: ${reason}`, {
      fromStage,
      toStage,
      reason,
    })
    this.name = 'InvalidTransitionError'
  }
}

/**
 * Thrown when a story is already at the target stage
 *
 * This is typically a warning scenario, not a hard error.
 *
 * @example
 * ```typescript
 * throw new StageConflictError('STORY-001', 'in-progress')
 * ```
 */
export class StageConflictError extends StageMovementError {
  constructor(
    public readonly storyId: string,
    public readonly currentStage: string,
  ) {
    super(`Story ${storyId} is already at stage ${currentStage}`, {
      storyId,
      currentStage,
    })
    this.name = 'StageConflictError'
  }
}
