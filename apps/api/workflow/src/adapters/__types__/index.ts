/**
 * Type Definitions and Custom Errors for Story File Adapter
 */

export class StoryFileAdapterError extends Error {
  constructor(
    message: string,
    readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'StoryFileAdapterError'
  }
}

export class StoryNotFoundError extends StoryFileAdapterError {
  constructor(readonly filePath: string) {
    super(`Story not found: ${filePath}`, { filePath })
    this.name = 'StoryNotFoundError'
  }
}

export class CheckpointNotFoundError extends StoryFileAdapterError {
  constructor(readonly filePath: string) {
    super(`Checkpoint not found: ${filePath}`, { filePath })
    this.name = 'CheckpointNotFoundError'
  }
}

export class InvalidYAMLError extends StoryFileAdapterError {
  constructor(
    readonly filePath: string,
    readonly cause: Error,
  ) {
    super(`Invalid YAML in ${filePath}: ${cause.message}`, { filePath })
    this.name = 'InvalidYAMLError'
  }
}

export class ValidationError extends StoryFileAdapterError {
  constructor(
    readonly filePath: string,
    readonly validationErrors: Array<{ path: string[]; message: string }>,
  ) {
    super(`Validation failed for ${filePath}`, { filePath, validationErrors })
    this.name = 'ValidationError'
  }
}

export class WriteError extends StoryFileAdapterError {
  constructor(
    readonly filePath: string,
    readonly cause: Error,
  ) {
    super(`Write failed for ${filePath}: ${cause.message}`, { filePath })
    this.name = 'WriteError'
  }
}

export class ReadError extends StoryFileAdapterError {
  constructor(
    readonly filePath: string,
    readonly cause: Error,
  ) {
    super(`Read failed for ${filePath}: ${cause.message}`, { filePath })
    this.name = 'ReadError'
  }
}
