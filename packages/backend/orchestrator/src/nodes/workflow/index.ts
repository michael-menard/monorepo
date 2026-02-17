/**
 * Workflow Domain Nodes
 *
 * Nodes for orchestrating workflow automation tasks.
 */

// Doc-sync node
export {
  docSyncNode,
  createDocSyncNode,
  DocSyncConfigSchema,
  DocSyncResultSchema,
  type DocSyncConfig,
  type DocSyncResult,
  type GraphStateWithDocSync,
} from './doc-sync.js'

// Story file node
export {
  storyFileNode,
  createStoryFileNode,
  StoryFileNodeConfigSchema,
  StoryFileNodeResultSchema,
  type StoryFileNodeConfig,
  type StoryFileNodeResult,
  type GraphStateWithStoryFile,
} from './story-file-node.js'

// Index node
export {
  indexNode,
  createIndexNode,
  IndexNodeConfigSchema,
  IndexNodeResultSchema,
  type IndexNodeConfig,
  type IndexNodeResult,
  type GraphStateWithIndex,
} from './index-node.js'

// Stage movement node
export {
  stageMovementNode,
  createStageMovementNode,
  StageMovementNodeConfigSchema,
  StageMovementNodeResultSchema,
  type StageMovementNodeConfig,
  type StageMovementNodeResult,
  type GraphStateWithStageMovement,
} from './stage-movement-node.js'

// Checkpoint node
export {
  checkpointNode,
  createCheckpointNode,
  CheckpointNodeConfigSchema,
  CheckpointNodeResultSchema,
  type CheckpointNodeConfig,
  type CheckpointNodeResult,
  type GraphStateWithCheckpoint,
} from './checkpoint-node.js'

// Decision callback node
export {
  decisionCallbackNode,
  createDecisionCallbackNode,
  DecisionCallbackNodeConfigSchema,
  DecisionCallbackNodeResultSchema,
  type DecisionCallbackNodeConfig,
  type DecisionCallbackNodeResult,
  type GraphStateWithDecisionCallback,
} from './decision-callback-node.js'

// KB writer node
export {
  kbWriterNode,
  createKBWriterNode,
  KBWriterNodeConfigSchema,
  KBWriterNodeResultSchema,
  type KBWriterNodeConfig,
  type KBWriterNodeResult,
  type GraphStateWithKBWriter,
} from './kb-writer-node.js'
