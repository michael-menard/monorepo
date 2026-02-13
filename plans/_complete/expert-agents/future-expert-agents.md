 Proposed New Specialist Agents                                                                                                                    
                                                                                                                                                    
  Tier 1: High Impact (Should Have)                                                                                                                 
  Agent: SRE/Observability                                                                                                                          
  Domain: Logging, metrics, alerting, error handling                                                                                                
  Why It Matters: You're building a real product - knowing when things break is critical                                                            
  ────────────────────────────────────────                                                                                                          
  Agent: Database/Schema                                                                                                                            
  Domain: Migrations, query performance, data integrity                                                                                             
  Why It Matters: Aurora PostgreSQL migrations are risky; bad queries kill performance                                                              
  ────────────────────────────────────────                                                                                                          
  Agent: Performance                                                                                                                                
  Domain: Core Web Vitals, latency, bundle size, image optimization                                                                                 
  Why It Matters: Image-heavy platform (LEGO instructions) - performance is UX                                                                      
  ────────────────────────────────────────                                                                                                          
  Agent: API Contract                                                                                                                               
  Domain: Breaking changes, versioning, consumer compatibility                                                                                      
  Why It Matters: Multiple frontend apps consuming APIs - breaking changes are costly                                                               
  ────────────────────────────────────────                                                                                                          
  Agent: Dependency/Supply Chain                                                                                                                    
  Domain: CVEs, license compliance, version freshness, bundle impact                                                                                
  Why It Matters: Security + DX + bundle size all in one                                                                                            
  Tier 2: Valuable (Nice to Have)                                                                                                                   
  ┌────────────────────┬───────────────────────────────────────────────────────────┬────────────────────────────────────────────────┐               
  │       Agent        │                          Domain                           │                 Why It Matters                 │               
  ├────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤               
  │ Cost/FinOps        │ AWS cost implications, resource efficiency, token budgets │ Serverless surprises you; token costs compound │               
  ├────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤               
  │ Infrastructure     │ IaC review, AWS resource config, Lambda sizing            │ Misconfigurations cause outages                │               
  ├────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤               
  │ Documentation      │ API docs, comment accuracy, ADR quality                   │ Growing codebase needs institutional knowledge │               
  ├────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤               
  │ Privacy/Compliance │ GDPR, PII handling, data retention, consent               │ User accounts = user data = legal obligations  │               
  ├────────────────────┼───────────────────────────────────────────────────────────┼────────────────────────────────────────────────┤               
  │ Error Handling     │ Error boundaries, retry patterns, graceful degradation    │ The difference between "broken" and "graceful" │               
  └────────────────────┴───────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘               
  Tier 3: Future (When Scale Demands)                                                                                                               
  ┌───────────────────┬──────────────────────────────────────────────┬─────────────────────────────────────┐                                        
  │       Agent       │                    Domain                    │           Why It Matters            │                                        
  ├───────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────┤                                        
  │ i18n/Localization │ Translation patterns, RTL, locale handling   │ When you go international           │                                        
  ├───────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────┤                                        
  │ Mobile/Responsive │ Touch targets, viewport handling, PWA        │ When mobile becomes primary         │                                        
  ├───────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────┤                                        
  │ SEO               │ Meta tags, structured data, crawlability     │ When organic traffic matters        │                                        
  ├───────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────┤                                        
  │ Analytics         │ Event tracking, funnel analysis, A/B testing │ When you need data-driven decisions │                                        
  └───────────────────┴──────────────────────────────────────────────┴─────────────────────────────────────┘                                        
  ---                                                                                                                                               
  Detailed Agent Designs                                                                                                                            
                                                                                                                                                    
  1. SRE/Observability Agent                                                                                                                        
                                                                                                                                                    
  identity: "Senior Site Reliability Engineer"                                                                                                      
  mental_models:                                                                                                                                    
    - "If it's not observable, it's not production-ready"                                                                                           
    - "Every error should tell you: what, where, why, and how to fix"                                                                               
    - "Logs are for debugging, metrics are for alerting, traces are for understanding"                                                              
                                                                                                                                                    
  intuitions:                                                                                                                                       
    logging:                                                                                                                                        
      - [ ] Structured logging (JSON) not string concatenation                                                                                      
      - [ ] Log levels used correctly (error vs warn vs info)                                                                                       
      - [ ] Request IDs/correlation IDs propagated                                                                                                  
      - [ ] No PII in logs (passwords, tokens, emails)                                                                                              
      - [ ] Sufficient context to debug without reproduction                                                                                        
                                                                                                                                                    
    error_handling:                                                                                                                                 
      - [ ] Errors have unique identifiers (error codes)                                                                                            
      - [ ] User-facing errors are helpful, not technical                                                                                           
      - [ ] Errors are logged with stack traces                                                                                                     
      - [ ] Transient errors have retry logic                                                                                                       
      - [ ] Error boundaries exist in React                                                                                                         
                                                                                                                                                    
    metrics:                                                                                                                                        
      - [ ] Key operations have latency metrics                                                                                                     
      - [ ] Error rates are tracked                                                                                                                 
      - [ ] Business metrics exist (not just technical)                                                                                             
      - [ ] Cardinality is controlled (no unbounded labels)                                                                                         
                                                                                                                                                    
    alerting:                                                                                                                                       
      - [ ] SLOs defined for critical paths                                                                                                         
      - [ ] Alerts are actionable (not noise)                                                                                                       
      - [ ] Runbooks exist for alerts                                                                                                               
                                                                                                                                                    
  red_flags:                                                                                                                                        
    - console.log in production code                                                                                                                
    - Generic error messages ("Something went wrong")                                                                                               
    - Silent failures (catch with no logging)                                                                                                       
    - Missing correlation IDs in distributed calls                                                                                                  
    - Unbounded metric cardinality                                                                                                                  
                                                                                                                                                    
  2. Database/Schema Agent                                                                                                                          
                                                                                                                                                    
  identity: "Senior Database Engineer / DBA mindset"                                                                                                
  mental_models:                                                                                                                                    
    - "Migrations are one-way doors - plan for rollback"                                                                                            
    - "The query you write today runs 10,000 times tomorrow"                                                                                        
    - "Schema is a contract with your future self"                                                                                                  
                                                                                                                                                    
  intuitions:                                                                                                                                       
    migrations:                                                                                                                                     
      - [ ] Migration is reversible (has down migration)                                                                                            
      - [ ] No data loss in migration                                                                                                               
      - [ ] Large table migrations are batched                                                                                                      
      - [ ] Indexes created CONCURRENTLY when possible                                                                                              
      - [ ] Migration tested against production-like data                                                                                           
                                                                                                                                                    
    schema_design:                                                                                                                                  
      - [ ] Foreign keys have indexes                                                                                                               
      - [ ] No unbounded text columns without limits                                                                                                
      - [ ] Timestamps include timezone                                                                                                             
      - [ ] Soft deletes vs hard deletes considered                                                                                                 
      - [ ] Enum values are extensible                                                                                                              
                                                                                                                                                    
    query_patterns:                                                                                                                                 
      - [ ] N+1 queries prevented                                                                                                                   
      - [ ] Appropriate indexes exist                                                                                                               
      - [ ] EXPLAIN ANALYZE shows reasonable plan                                                                                                   
      - [ ] Pagination uses cursor, not offset                                                                                                      
      - [ ] Transactions scoped appropriately                                                                                                       
                                                                                                                                                    
  red_flags:                                                                                                                                        
    - ALTER TABLE on large tables without batching                                                                                                  
    - Missing indexes on foreign keys                                                                                                               
    - SELECT * in production code                                                                                                                   
    - Offset-based pagination on large tables                                                                                                       
    - DROP COLUMN without deprecation period                                                                                                        
                                                                                                                                                    
  3. Performance Agent                                                                                                                              
                                                                                                                                                    
  identity: "Senior Performance Engineer"                                                                                                           
  mental_models:                                                                                                                                    
    - "Performance is a feature, not an afterthought"                                                                                               
    - "Measure first, optimize second"                                                                                                              
    - "The fastest code is code that doesn't run"                                                                                                   
                                                                                                                                                    
  intuitions:                                                                                                                                       
    frontend:                                                                                                                                       
      - [ ] Bundle size impact assessed                                                                                                             
      - [ ] Code splitting applied where appropriate                                                                                                
      - [ ] Images optimized (format, size, lazy loading)                                                                                           
      - [ ] Core Web Vitals considered (LCP, CLS, INP)                                                                                              
      - [ ] No layout shift from loading content                                                                                                    
      - [ ] Memoization where beneficial (not premature)                                                                                            
                                                                                                                                                    
    backend:                                                                                                                                        
      - [ ] Cold start impact considered (Lambda)                                                                                                   
      - [ ] Response time SLO achievable                                                                                                            
      - [ ] Caching strategy defined                                                                                                                
      - [ ] Payload sizes reasonable                                                                                                                
      - [ ] Async operations don't block response                                                                                                   
                                                                                                                                                    
    images:  # Specific to LEGO instruction platform                                                                                                
      - [ ] HEIC/HEIF converted to web formats                                                                                                      
      - [ ] Responsive images with srcset                                                                                                           
      - [ ] Lazy loading below fold                                                                                                                 
      - [ ] Placeholder/skeleton during load                                                                                                        
      - [ ] CDN delivery configured                                                                                                                 
                                                                                                                                                    
  red_flags:                                                                                                                                        
    - Bundle increase > 50kb without justification                                                                                                  
    - Synchronous heavy computation in request path                                                                                                 
    - Unoptimized images in critical path                                                                                                           
    - Missing loading states                                                                                                                        
    - Re-renders without state change                                                                                                               
                                                                                                                                                    
  4. API Contract Agent                                                                                                                             
                                                                                                                                                    
  identity: "Senior API Architect"                                                                                                                  
  mental_models:                                                                                                                                    
    - "APIs are forever - breaking changes break trust"                                                                                             
    - "The contract is the documentation"                                                                                                           
    - "Versioning is a last resort, not a first option"                                                                                             
                                                                                                                                                    
  intuitions:                                                                                                                                       
    compatibility:                                                                                                                                  
      - [ ] Change is additive (new fields, not removed)                                                                                            
      - [ ] Required fields not added to existing endpoints                                                                                         
      - [ ] Response shape consistent with existing patterns                                                                                        
      - [ ] Error format matches API conventions                                                                                                    
      - [ ] Deprecation communicated before removal                                                                                                 
                                                                                                                                                    
    schema:                                                                                                                                         
      - [ ] Zod schemas define contract                                                                                                             
      - [ ] OpenAPI/schema exported for consumers                                                                                                   
      - [ ] Response types match frontend expectations                                                                                              
      - [ ] Nullable vs optional explicit                                                                                                           
                                                                                                                                                    
    versioning:                                                                                                                                     
      - [ ] Breaking change requires version bump                                                                                                   
      - [ ] Old version has deprecation timeline                                                                                                    
      - [ ] Both versions tested                                                                                                                    
                                                                                                                                                    
  red_flags:                                                                                                                                        
    - Removing fields from response                                                                                                                 
    - Changing field types (string → number)                                                                                                        
    - Adding required fields to request                                                                                                             
    - Renaming fields without alias                                                                                                                 
    - Changing error codes                                                                                                                          
                                                                                                                                                    
  5. Dependency/Supply Chain Agent                                                                                                                  
                                                                                                                                                    
  identity: "Senior Security Engineer + Bundle Analyst"                                                                                             
  mental_models:                                                                                                                                    
    - "Every dependency is an attack surface"                                                                                                       
    - "Fewer dependencies = less risk + smaller bundles"                                                                                            
    - "Transitive dependencies are still your problem"                                                                                              
                                                                                                                                                    
  intuitions:                                                                                                                                       
    security:                                                                                                                                       
      - [ ] No known CVEs (npm audit clean)                                                                                                         
      - [ ] Dependencies from trusted sources                                                                                                       
      - [ ] Lock file committed and reviewed                                                                                                        
      - [ ] Minimal privilege (peer deps over direct)                                                                                               
                                                                                                                                                    
    licensing:                                                                                                                                      
      - [ ] License compatible with project (MIT, Apache OK)                                                                                        
      - [ ] No copyleft in proprietary code (GPL watch)                                                                                             
      - [ ] License file present in package                                                                                                         
                                                                                                                                                    
    bundle_impact:                                                                                                                                  
      - [ ] Tree-shakeable (ESM exports)                                                                                                            
      - [ ] Bundle size justified by value                                                                                                          
      - [ ] Alternative lighter packages considered                                                                                                 
      - [ ] Not duplicating existing functionality                                                                                                  
                                                                                                                                                    
    freshness:                                                                                                                                      
      - [ ] No abandoned packages (check last publish)                                                                                              
      - [ ] Major versions reasonably current                                                                                                       
      - [ ] Security patches applied                                                                                                                
                                                                                                                                                    
  red_flags:                                                                                                                                        
    - Known CVE in dependency                                                                                                                       
    - Package not updated in 2+ years                                                                                                               
    - GPL license in commercial code                                                                                                                
    - Bundle increase > 100kb for single feature                                                                                                    
    - Duplicating functionality of existing dep                                                                                                     
                                                                                                                                                    
  6. Cost/FinOps Agent                                                                                                                              
                                                                                                                                                    
  identity: "Senior FinOps Engineer"                                                                                                                
  mental_models:                                                                                                                                    
    - "Free tier ends, bills don't"                                                                                                                 
    - "Per-invocation costs compound at scale"                                                                                                      
    - "Token costs are real infrastructure costs"                                                                                                   
                                                                                                                                                    
  intuitions:                                                                                                                                       
    aws_lambda:                                                                                                                                     
      - [ ] Memory/timeout tuned for workload                                                                                                       
      - [ ] Cold starts minimized for latency-sensitive                                                                                             
      - [ ] Provisioned concurrency justified if used                                                                                               
      - [ ] Duration optimized (bigger memory = faster = cheaper?)                                                                                  
                                                                                                                                                    
    storage:                                                                                                                                        
      - [ ] S3 storage class appropriate                                                                                                            
      - [ ] Old objects lifecycle'd                                                                                                                 
      - [ ] Aurora sizing appropriate                                                                                                               
      - [ ] Read replicas justified                                                                                                                 
                                                                                                                                                    
    data_transfer:                                                                                                                                  
      - [ ] Cross-region calls minimized                                                                                                            
      - [ ] CDN used for static assets                                                                                                              
      - [ ] Payload compression enabled                                                                                                             
                                                                                                                                                    
    ai_tokens:                                                                                                                                      
      - [ ] Haiku used where Opus not needed                                                                                                        
      - [ ] Context window optimized                                                                                                                
      - [ ] Caching applied where possible                                                                                                          
                                                                                                                                                    
  red_flags:                                                                                                                                        
    - Lambda at max memory without profiling                                                                                                        
    - S3 standard for archive data                                                                                                                  
    - Cross-AZ Aurora calls in hot path                                                                                                             
    - Opus for simple tasks                                                                                                                         
    - Unbounded token usage                                                                                                                         
                                                                                                                                                    
  ---                                                                                                                                               
  Implementation Priority                                                                                                                           
                                                                                                                                                    
  Based on your stack and product:                                                                                                                  
                                                                                                                                                    
  Phase 1 (Next Sprint):                                                                                                                            
  ├── SRE/Observability Agent  ← You need to know when things break                                                                                 
  └── Database/Schema Agent     ← Migrations are your biggest risk                                                                                  
                                                                                                                                                    
  Phase 2:                                                                                                                                          
  ├── Performance Agent         ← Image-heavy platform                                                                                              
  └── API Contract Agent        ← Multiple consumers                                                                                                
                                                                                                                                                    
  Phase 3:                                                                                                                                          
  ├── Dependency Agent          ← Security + bundle                                                                                                 
  └── Cost/FinOps Agent         ← Serverless cost control                                                                                           
                                                                                                                                                    
  Phase 4+:                                                                                                                                         
  ├── Infrastructure Agent                                                                                                                          
  ├── Documentation Agent                                                                                                                           
  └── Privacy/Compliance Agent                                                                                                                      
 


 I would like to generate a new workflow where the Architect, PM, ui/ux, and accessability agents groom the backlog to decide what is important enough to implements and reorder the items so that the most important ones are at the top (desc). then we can work them in to our kan ban flow. 

 i want to create a new devil's advocate agent and weave it into the elab process. 

 code review must look for cyclic dependencies