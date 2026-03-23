import { z } from 'zod'

export const ServiceKindSchema = z.enum(['frontend', 'backend'])
export type ServiceKind = z.infer<typeof ServiceKindSchema>

export const ServiceStatusSchema = z.enum(['healthy', 'unhealthy', 'unknown'])
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>

export const ConflictInfoSchema = z.object({
  expectedKey: z.string(),
  actualPid: z.number(),
  actualProcessName: z.string(),
})
export type ConflictInfo = z.infer<typeof ConflictInfoSchema>

export const ServiceHealthSchema = z.object({
  key: z.string(),
  name: z.string(),
  port: z.number(),
  kind: ServiceKindSchema,
  status: ServiceStatusSchema,
  responseTimeMs: z.number().nullable(),
  error: z.string().nullable(),
  checkedAt: z.string(),
  pid: z.number().nullable(),
  processName: z.string().nullable(),
  conflict: ConflictInfoSchema.nullable(),
  unregistered: z.boolean().optional(),
})
export type ServiceHealth = z.infer<typeof ServiceHealthSchema>

export const PortHealthResponseSchema = z.object({
  services: z.array(ServiceHealthSchema),
  summary: z.object({
    total: z.number(),
    healthy: z.number(),
    unhealthy: z.number(),
    unknown: z.number(),
  }),
  conflicts: z.array(ConflictInfoSchema),
  checkedAt: z.string(),
})
export type PortHealthResponse = z.infer<typeof PortHealthResponseSchema>

export const PortHistoryResponseSchema = z.record(
  z.string(),
  z.object({
    responseTimes: z.array(z.number().nullable()),
    statuses: z.array(z.string()),
  }),
)
export type PortHistoryResponse = z.infer<typeof PortHistoryResponseSchema>

export const TopologyNodeSchema = z.object({
  key: z.string(),
  name: z.string(),
  port: z.number(),
  kind: ServiceKindSchema,
})

export const TopologyEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
})

export const TopologyResponseSchema = z.object({
  nodes: z.array(TopologyNodeSchema),
  edges: z.array(TopologyEdgeSchema),
})
export type TopologyResponse = z.infer<typeof TopologyResponseSchema>
