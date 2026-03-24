/**
 * Telemetry LangGraph Nodes
 *
 * Fire-and-continue nodes for recording agent telemetry during graph execution.
 * All nodes use adapter injection for testability without a live MCP server.
 *
 * Usage:
 *   import { createLogInvocationNode, createLogOutcomeNode, createLogTokensNode } from './telemetry'
 *
 * Story: WINT-9100
 */

// log-invocation node
export {
  createLogInvocationNode,
  defaultInvocationLoggerFn,
  LogInvocationInputSchema,
  type InvocationLoggerFn,
  type LogInvocationInput,
  type GraphStateWithTelemetry,
} from './log-invocation.js'

// log-outcome node
export {
  createLogOutcomeNode,
  defaultOutcomeLoggerFn,
  LogOutcomeInputSchema,
  type OutcomeLoggerFn,
  type LogOutcomeInput,
} from './log-outcome.js'

// log-tokens node
export {
  createLogTokensNode,
  defaultTokenLoggerFn,
  LogTokensInputSchema,
  type TokenLoggerFn,
  type LogTokensInput,
} from './log-tokens.js'
