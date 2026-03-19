import { z } from 'zod'

const RoadmapConfigSchema = z.object({
  thrashThreshold: z.number().default(2),
})

type RoadmapConfig = z.infer<typeof RoadmapConfigSchema>

let config: RoadmapConfig = RoadmapConfigSchema.parse({})

export function initConfig(overrides: Partial<RoadmapConfig>) {
  config = RoadmapConfigSchema.parse({ ...config, ...overrides })
}

export function getConfig(): Readonly<RoadmapConfig> {
  return config
}
