/**
 * Pipeline Database Migration Runner
 * APIP-5001: Provisional migration runner for LangGraph checkpoint schema
 *
 * Applies numbered SQL migration files in sequence.
 * Idempotent — safe to run on an already-migrated database.
 *
 * Usage:
 *   pnpm db:migrate:test
 *   # or directly:
 *   tsx scripts/apply-migrations.ts
 *
 * Environment variables (PIPELINE_DB_* prefix):
 *   PIPELINE_DB_HOST, PIPELINE_DB_PORT, PIPELINE_DB_NAME,
 *   PIPELINE_DB_USER, PIPELINE_DB_PASSWORD
 *
 * NOTE: This runner is PROVISIONAL and will be superseded by APIP-5007
 * which integrates the @langchain/langgraph-checkpoint-postgres setup() method.
 *
 * @see APIP-5001 AC-3
 * @see APIP-5007 (supersedes this runner for production use)
 */
export {};
//# sourceMappingURL=apply-migrations.d.ts.map