/**
 * Configuration module for the LangGraph orchestrator.
 *
 * Provides model assignments and LLM provider configuration
 * for hybrid Claude/Ollama support.
 *
 * @module config
 */

// Model Assignments
export {
  // Schemas
  ClaudeModelSchema,
  OllamaModelSchema,
  ModelSchema,
  ModelAssignmentsSchema,
  // Types
  type ClaudeModel,
  type OllamaModel,
  type Model,
  type ModelProvider,
  type ParsedOllamaModel,
  type ModelAssignments,
  // Provider detection
  getModelProvider,
  isOllamaModel,
  isClaudeModel,
  parseOllamaModel,
  // Defaults
  DEFAULT_MODEL_ASSIGNMENTS,
  // Loading
  loadModelAssignments,
  clearModelAssignmentsCache,
  // Lookup
  getModelForAgent,
  getAgentsForModel,
  hasModelAssignment,
  // Selection helpers
  MODEL_SELECTION_CRITERIA,
  suggestModel,
} from './model-assignments.js'

// LLM Provider
export {
  // Config
  LLMProviderConfigSchema,
  type LLMProviderConfig,
  loadLLMProviderConfig,
  clearLLMProviderConfigCache,
  // Ollama availability
  isOllamaAvailable,
  clearOllamaAvailabilityCache,
  // LLM creation
  createOllamaLLM,
  clearOllamaLLMCache,
  // Main entry points
  getLLMForAgent,
  getModelInfoForAgent,
  type LLMResult,
} from './llm-provider.js'
