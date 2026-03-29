/**
 * Graph Get Franken Features MCP Tool - DISABLED
 *
 * APRS-5040: This file references 'features' and 'capabilities' tables that do not exist
 * in the knowledge-base schema. These tables may have been planned but never implemented.
 *
 * To restore this functionality:
 * 1. Define features and capabilities tables in @repo/knowledge-base/src/db/schema
 * 2. Export them from @repo/knowledge-base/db index
 * 3. Uncomment the implementation below
 */

import {
  type GraphGetFrankenFeaturesInput,
  type FrankenFeatureItem,
} from './__types__/index.js'

/**
 * Identify features with incomplete CRUD capabilities (Franken-features)
 *
 * DISABLED: Required tables (features, capabilities) do not exist in schema (APRS-5040)
 * Returns empty array until implementation is completed.
 *
 * @param _input - Optional package name filter (unused)
 * @returns Empty array
 */
export async function graph_get_franken_features(
  _input: GraphGetFrankenFeaturesInput,
): Promise<FrankenFeatureItem[]> {
  // TODO: Implement when features and capabilities tables are created
  return []
}
