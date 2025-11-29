# Appendices

## A. Open Questions (Resolved)

All open questions from the brief have been resolved through user clarification:

✅ **Feature Flag Mechanism**: Runtime config file (`/config.json` from S3)
✅ **Rollout Control**: Route53 weighted routing (DNS-level traffic split)
✅ **CDN Caching**: Not applicable (direct Amplify/S3 hosting, no CloudFront)
✅ **User Geography**: North America + Europe (latency SLA adjusted accordingly)
✅ **Redis Cache Strategy**: Hybrid selective flush + serverless namespacing
✅ **API Gateway URLs**: To be provided by DevOps during Story 1.1 implementation

## B. Timeline Estimate

**Total Duration**: 4-5 weeks

- **Week 1**: Infrastructure + Frontend Implementation (Stories 1.1-1.6)
- **Week 2**: Backend Changes + Automation (Stories 1.7-1.9)
- **Week 3**: Monitoring + Staging Validation (Stories 1.10-1.11)
- **Week 4**: Production Rollout (Stories 1.12-1.15, 1 day per stage + observation)
- **Week 5**: Final monitoring + Express decommissioning (Story 1.16)

## C. Risks Not Addressed (Accepted)

**Low-Priority Risks Accepted for MVP:**

- **WebSocket Migration**: Deferred to Phase 2 (out of scope)
- **Multi-Region Deployment**: Single-region acceptable for MVP, plan for Phase 2 if EU latency unacceptable
- **Provisioned Lambda Concurrency**: Not implementing initially, will evaluate post-migration if cold starts problematic
- **Advanced Feature Flags (LaunchDarkly)**: Using simple config file for MVP, can upgrade later if needed

## D. References

**Technical Documentation:**

- `/docs/architecture/source-tree.md` - Monorepo structure
- `/docs/architecture/tech-stack.md` - Frontend/backend technology stack
- `apps/api/lego-api-serverless/sst.config.ts` - Serverless infrastructure (API routes defined lines 598-1521)
- `apps/web/lego-moc-instructions-app/src/config/api.ts` - Current API configuration
- `apps/web/lego-moc-instructions-app/src/services/api.ts` - RTK Query setup

**Migration Context:**

- Express API originally on port 9000 (`apps/api/lego-projects-api/`)
- Serverless API routes: `/health`, `/api/mocs/*`, `/api/images/*`, `/api/albums/*`, `/api/wishlist/*`, `/api/moc-instructions/*/parts-lists/*`
- WebSocket API: `$connect`, `$disconnect`, `$default` routes

---

**Document Version:** 1.1
**Last Updated:** 2025-11-23
**Status:** ✅ PO Approved - Ready for Sprint Planning

---

**End of PRD**
