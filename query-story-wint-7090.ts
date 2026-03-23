import * as dotenv from 'dotenv'
import path from 'path'

// Load .env from knowledge-base app
dotenv.config({ path: path.join(process.cwd(), 'apps/api/knowledge-base/.env') })

import { getDbClient } from './apps/api/knowledge-base/src/db/client.js'
import { stories, storyArtifacts, storyDependencies } from './apps/api/knowledge-base/src/db/schema.js'
import { eq } from 'drizzle-orm'

async function main() {
  const db = getDbClient()

  try {
    // Get the main story record
    const storyResult = await db
      .select({
        storyId: stories.storyId,
        feature: stories.feature,
        title: stories.title,
        description: stories.description,
        state: stories.state,
        priority: stories.priority,
        blockedReason: stories.blockedReason,
        blockedByStory: stories.blockedByStory,
        startedAt: stories.startedAt,
        completedAt: stories.completedAt,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
      })
      .from(stories)
      .where(eq(stories.storyId, 'WINT-7090'))

    // Get artifacts
    const artifactResult = await db
      .select()
      .from(storyArtifacts)
      .where(eq(storyArtifacts.storyId, 'WINT-7090'))

    // Get dependencies
    const dependencyResult = await db
      .select()
      .from(storyDependencies)
      .where(eq(storyDependencies.storyId, 'WINT-7090'))

    console.log('=== Story Record ===')
    console.log(JSON.stringify(storyResult, null, 2))
    console.log('\n=== Artifacts ===')
    console.log(JSON.stringify(artifactResult, null, 2))
    console.log('\n=== Dependencies ===')
    console.log(JSON.stringify(dependencyResult, null, 2))
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

main()
