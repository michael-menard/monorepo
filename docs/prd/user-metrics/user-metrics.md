# Project Brief: User Tracking & Metrics Implementation

## Executive Summary

This project implements a self-hosted, open-source user tracking and analytics system for our existing website using OpenReplay for session replay and user behavior analysis, Umami for privacy-focused web analytics, and Grafana for unified metrics visualization and monitoring. The primary problem being solved is the current lack of visibility into three critical areas: (1) Product organization needs to understand where users spend their time to prioritize feature work, (2) Developers need performance metrics around latency, traffic, and errors to maintain application health, and (3) Customer Service needs session replay capabilities to troubleshoot user issues efficiently. The target users are Product teams (for usage-based prioritization), Engineering teams (for performance monitoring), and Customer Service teams (for support troubleshooting). The key value proposition is a fully self-hosted, open-source observability stack that maintains complete data ownership while serving multiple organizational needs: OpenReplay provides session replay for CS troubleshooting and product insights, Umami delivers privacy-respecting usage analytics for product prioritization, and Grafana consolidates performance metrics for engineering while providing cross-functional dashboards for all stakeholders. This approach eliminates vendor lock-in, ensures data privacy, and provides long-term cost predictability.

## Problem Statement

**Current State:**
Our organization currently operates with limited visibility into how users interact with our website and how the application performs in production. This creates three distinct pain points across different teams:

1. **Product Team Blindness:** The product organization lacks data-driven insights into which features users actually engage with and where they spend their time. This forces product prioritization decisions to be made based on assumptions, stakeholder opinions, or anecdotal feedback rather than observable user behavior patterns.

2. **Engineering Dark Spots:** Developers have insufficient visibility into application performance metrics including latency, traffic patterns, and error rates. When performance issues or errors occur, the team lacks the diagnostic data needed to quickly identify root causes, leading to longer resolution times and degraded user experience.

3. **Customer Service Manual Detective Work:** When users report issues, the customer service team must rely on user-provided descriptions and screenshots to understand what happened. Without the ability to replay user sessions, troubleshooting becomes a time-consuming process of back-and-forth questioning, often failing to capture the full context of the user's problem.

**Impact:**
- **Wasted Development Resources:** Teams may invest effort in features that users don't value while neglecting high-impact areas
- **Slower Issue Resolution:** Both performance problems and customer support tickets take longer to resolve without proper observability
- **Poor User Experience:** Issues may persist unnoticed or be difficult to diagnose when reported
- **Suboptimal Product Decisions:** Lack of usage data leads to guesswork in roadmap planning

**Why Existing Solutions Fall Short:**
Currently, the organization lacks a comprehensive observability solution. Any existing analytics may be fragmented, incomplete, or not tailored to serve the distinct needs of product, engineering, and customer service teams simultaneously.

**Urgency:**
As the application grows and user base expands, the cost of operating without proper observability increases. The inability to make data-informed decisions, diagnose issues quickly, and understand user behavior represents a competitive disadvantage and operational risk that needs addressing.

## Proposed Solution

**Core Concept:**
Implement a self-hosted, open-source observability stack consisting of three integrated tools, each purpose-built for specific organizational needs while maintaining complete data ownership and privacy control.

**Solution Components:**

**1. OpenReplay - Session Replay & Behavior Analysis**
- Records user sessions including clicks, navigation, form interactions, and UI state
- Provides visual replay capability for Customer Service troubleshooting
- Captures console errors and network requests for debugging context
- Generates user journey analytics for Product team insights
- **Privacy-first implementation:** PII masking enabled by default, configurable sanitization rules

**2. Umami - Privacy-Focused Web Analytics**
- Lightweight, GDPR-compliant analytics without cookies
- Tracks page views, referrers, device types, and traffic sources
- Provides usage heatmaps and engagement metrics
- Powers product team's data-driven prioritization decisions
- **Open-source advantage:** Full control over data retention and collection policies

**3. Grafana - Unified Metrics Visualization**
- Central dashboard platform aggregating data from multiple sources
- Visualizes application performance metrics (latency, errors, throughput)
- Creates custom dashboards for each stakeholder group
- Enables correlation between user behavior and system performance
- Supports alerting and anomaly detection

**Integration Architecture:**
- OpenReplay and Umami tracking scripts integrated into website frontend
- Application performance metrics pushed to Grafana data sources (Prometheus, InfluxDB, or direct integrations)
- Optional: Data pipeline to correlate session IDs across tools for unified analysis
- All infrastructure self-hosted within organization's control

**Key Differentiators:**

**vs. Commercial SaaS Solutions:**
- ✅ Complete data ownership and control
- ✅ No vendor lock-in or pricing uncertainty
- ✅ Customizable to specific organizational needs
- ✅ Privacy-first by design, not by policy

**vs. Single All-in-One Tools:**
- ✅ Best-of-breed capability in each domain
- ✅ Grafana serves as unifying layer while each tool excels at its specialty
- ✅ Can replace individual components without rebuilding entire stack

**Why This Will Succeed:**
1. **Technical Capability:** Strong technical team can handle self-hosted infrastructure and integrations
2. **Strategic Alignment:** Open-source preference ensures long-term viability and customization options
3. **Privacy First:** PII masking and self-hosting addresses privacy concerns while maintaining insights
4. **Multi-Stakeholder Value:** Each tool directly serves specific team needs rather than compromise solution
5. **Future-Ready:** Foundation supports AI/ML enhancements and advanced analytics as needs evolve

**High-Level Vision:**
Create a comprehensive observability foundation that not only solves immediate visibility gaps but serves as the data infrastructure for future capabilities like automated anomaly detection, predictive analytics, and AI-powered user insights—all while maintaining complete control over sensitive user data.

## Target Users

This solution serves three distinct user segments within the organization, each with unique needs and workflows:

### Primary User Segment: Product Organization

**Profile:**
- Product Managers, Product Owners, and Product Analysts
- Responsible for roadmap planning, feature prioritization, and product strategy
- Data-savvy but not necessarily technical
- Need to justify decisions with evidence

**Current Behaviors & Workflows:**
- Review user feedback from support tickets, surveys, and stakeholder meetings
- Make prioritization decisions in sprint planning and roadmap sessions
- Track success of shipped features through indirect signals (support volume, revenue)
- Create hypotheses about user needs without direct behavioral evidence

**Specific Needs & Pain Points:**
- **Need:** Quantitative data on which features get used and how much time users spend in each area
- **Need:** Visual understanding of user journeys and common paths
- **Pain:** Difficulty defending prioritization decisions without usage data
- **Pain:** Can't distinguish between vocal minority requests and actual user behavior patterns
- **Pain:** No way to validate if shipped features achieved intended engagement

**Goals:**
- Make evidence-based prioritization decisions
- Identify high-value areas for development investment
- Validate feature success post-launch
- Discover unexpected usage patterns and opportunities

**Primary Tools:** Umami (usage analytics, engagement metrics) + OpenReplay (user journey visualization)

### Secondary User Segment: Engineering Team

**Profile:**
- Software Engineers, DevOps Engineers, Site Reliability Engineers
- Responsible for application performance, reliability, and technical quality
- Highly technical, comfortable with metrics and dashboards
- On-call rotation for production issues

**Current Behaviors & Workflows:**
- Monitor application logs and basic server metrics
- Respond to performance issues reactively when reported
- Deploy code changes with limited visibility into user impact
- Debug production issues with limited context

**Specific Needs & Pain Points:**
- **Need:** Real-time visibility into latency, error rates, and traffic patterns
- **Need:** Ability to correlate code deployments with performance changes
- **Pain:** Slow diagnosis of production issues due to lack of observability
- **Pain:** Can't proactively detect performance degradation before users complain
- **Pain:** Limited ability to validate that performance improvements actually helped users

**Goals:**
- Maintain application performance within SLAs
- Quickly diagnose and resolve production issues
- Proactively detect anomalies before user impact
- Measure technical improvements (reduced latency, fewer errors)

**Primary Tools:** Grafana (performance dashboards, alerting) + OpenReplay (visual debugging context)

### Secondary User Segment: Customer Service Team

**Profile:**
- Customer Service Representatives, Support Engineers, Technical Support
- First line of contact for user issues and questions
- Range of technical ability from non-technical to semi-technical
- Measured on ticket resolution time and customer satisfaction

**Current Behaviors & Workflows:**
- Receive support tickets describing user problems
- Ask follow-up questions to understand what user did and saw
- Escalate complex issues to engineering with incomplete information
- Document workarounds and solutions in knowledge base

**Specific Needs & Pain Points:**
- **Need:** Visual replay of exactly what user experienced when issue occurred
- **Need:** Context about errors, network issues, or UI state during session
- **Pain:** Time-consuming back-and-forth trying to reproduce user's problem
- **Pain:** User descriptions often incomplete or inaccurate ("I clicked the button and nothing happened")
- **Pain:** Can't provide engineering with sufficient detail for bug reports
- **Pain:** Difficult to verify if suggested solution actually addresses user's issue

**Goals:**
- Reduce time-to-resolution for support tickets
- Provide detailed bug reports to engineering
- Build knowledge base of common issues with visual examples
- Improve first-contact resolution rate

**Primary Tools:** OpenReplay (session replay for troubleshooting)

## Goals & Success Metrics

### Business Objectives

- **Enable Data-Driven Product Decisions from Day One:** Product team can prioritize features based on actual usage data rather than assumptions, starting with launch cohort (Target: 100% of post-launch prioritization decisions backed by usage metrics)

- **Establish Baseline Performance Metrics:** Capture comprehensive performance data from launch to establish SLAs and identify optimization opportunities (Target: Complete performance baseline documented within first 30 days of launch)

- **Build Support Troubleshooting Capability:** Customer service can resolve early user issues quickly with session replay context, critical during initial launch phase (Target: Session replay available for all reported issues during launch period)

- **Establish Privacy-First Observability Foundation:** Maintain complete data ownership and control while meeting all observability needs (Target: 100% of analytics data self-hosted with PII masking enabled from day one)

- **Create Scalable Data Infrastructure:** Build observability foundation that scales as user base grows beyond initial launch cohort (Target: Infrastructure supports 10x user growth without architectural changes)

### User Success Metrics

- **Product Team Learning Velocity:** Product managers can answer key questions about user behavior weekly (Target: Weekly usage reports generated and reviewed in team meetings)

- **Engineering Team Proactive Monitoring:** Developers establish monitoring practices and alerting baselines (Target: Core performance dashboards created and monitored within first 2 weeks)

- **CS Team Readiness:** Support team trained and comfortable using session replay before issues arise (Target: 100% of CS team trained on OpenReplay within first week of launch)

- **Early User Behavior Understanding:** Team develops deep understanding of initial user cohort behavior patterns (Target: User journey maps documented for top 5 feature areas within first 60 days)

### Key Performance Indicators (KPIs)

- **System Uptime & Reliability:** All three tools (OpenReplay, Umami, Grafana) maintain 99%+ uptime from launch - Target: Establish reliability baseline in first 90 days

- **Data Coverage:** Track percentage of user sessions captured - Target: 100% of production traffic instrumented at launch (easier with small user base)

- **Performance Overhead:** Ensure tracking scripts don't negatively impact user experience - Target: <50ms impact on page load time, measured from launch

- **Data Retention Compliance:**
  - **Session Replays:** 30-day retention with automatic cleanup
  - **Analytics Data (Umami):** 1-year retention for trend analysis
  - **Performance Metrics (Grafana):** 1-year retention with appropriate aggregation
  - Target: Automated retention policies configured before launch

- **Launch Readiness:** All monitoring infrastructure operational before first users - Target: 100% of dashboards and tracking active at launch

- **Initial User Coverage:** With small launch cohort, aim for complete visibility - Target: Track and understand behavior of 100% of launch users

- **Issue Detection & Resolution:** Build rapid feedback loop with small user base - Target: All reported issues have associated session replay and performance data for analysis

## MVP Scope

### Core Features (Must Have)

**1. AWS Infrastructure Foundation (via SST)**
- Extend existing SST configuration with observability stack constructs
- Deploy Prometheus (ECS/Fargate for scraping, or CloudWatch Container Insights)
- Leverage existing CloudWatch for Lambda metrics and logs
- Use existing OpenSearch for log aggregation and analysis
- Set up S3 buckets for long-term storage (session replays, metrics backups) with Intelligent-Tiering
- Configure API Gateway logging to CloudWatch
- **Rationale:** Extend existing SST config; CloudWatch native for Lambda; OpenSearch already available; S3 Intelligent-Tiering reduces costs automatically

**2. Lambda Function Instrumentation (TypeScript)**
- Add CloudWatch Embedded Metric Format (EMF) to Lambda functions for custom metrics
- Implement structured logging (Winston/Pino) to CloudWatch Logs
- Instrument key metrics per Lambda:
  - Cold start duration
  - Execution duration (p50, p95, p99)
  - Error count and types
  - Invocation count
- Add custom business metrics (e.g., API endpoint-specific metrics)
- Configure X-Ray tracing for distributed tracing (optional but recommended)
- **Rationale:** EMF provides custom metrics without additional infrastructure; structured logs enable OpenSearch analysis; X-Ray helps debug serverless chains

**3. React Frontend Instrumentation (Vite)**
- Add performance monitoring (Web Vitals: LCP, FID, CLS)
- Implement client-side error tracking (send to CloudWatch via API Gateway)
- Track frontend metrics (bundle size impact, render times)
- Configure Vite build to properly include tracking scripts
- Optimize script loading to minimize impact on Vite's fast HMR
- **Rationale:** Complete observability requires frontend visibility; Web Vitals critical for UX; Vite-specific configuration ensures tracking doesn't break dev experience

**4. OpenReplay Session Replay - Serverless AWS Deployment**
- Deploy self-hosted OpenReplay via SST (ECS/Fargate - required for OpenReplay backend)
- Configure S3 bucket for session replay storage with 30-day lifecycle policy and Intelligent-Tiering
- Integrate OpenReplay tracking script into React/Vite application
- Configure CloudFront to properly serve tracking assets (cache headers)
- Configure PII masking for sensitive fields (email, names, payment info, etc.)
- Enable session recording with console logs and network requests
- Basic search and filtering of recorded sessions
- **Rationale:** OpenReplay requires backend services (can't be fully serverless); S3 storage cost-effective; CloudFront caching optimizes script delivery; PII masking non-negotiable

**5. Umami Analytics - Serverless AWS Deployment**
- Deploy Umami via SST (ECS/Fargate or EC2 t3.micro for cost optimization)
- Create dedicated schema in existing Aurora database for Umami data
- Install Umami tracking script in React application (loaded via CloudFront)
- Configure CloudFront cache headers for tracking script
- Configure basic event tracking (page views, referrers, devices)
- Create default dashboard showing traffic overview and top pages
- Set up 1-year data retention policy
- **Rationale:** Leverage existing Aurora DB (no new database cost); Umami lightweight; CloudFront ensures fast script delivery globally

**6. Grafana - Serverless Performance Dashboards**
- Deploy Grafana via SST (ECS/Fargate t3.small or t3.micro for budget)
- Configure data sources:
  - **CloudWatch** (primary - Lambda metrics, API Gateway, logs)
  - **CloudWatch Metrics Insights** (EMF custom metrics)
  - **OpenSearch** (log analysis and search)
- Create initial dashboards:
  - **Lambda Performance:** Cold starts, duration, errors, invocations per function
  - **API Gateway:** Request count, latency, 4xx/5xx errors
  - **Frontend Performance:** Web Vitals, client-side errors
  - **CloudFront Metrics:** Cache hit ratio, request distribution, edge location performance
  - **Cost Tracking:** Lambda invocations, data transfer (if metrics available)
  - **Log Analysis:** Error patterns from OpenSearch
- **Rationale:** CloudWatch native for serverless; EMF provides custom metrics without Prometheus overhead; CloudFront metrics show global performance; cost dashboard helps with budget story

**7. Data Retention & Storage Strategy (Budget-Conscious)**
- **OpenReplay:** 30-day S3 lifecycle policy with Intelligent-Tiering
- **Umami:** 1-year retention in existing Aurora DB (minimal storage cost)
- **CloudWatch Logs:**
  - Production: 90-day retention, then export to S3 (cheaper long-term storage)
  - Development: 7-day retention
- **CloudWatch Metrics:** 15-month default retention (free)
- **OpenSearch:** Configure index lifecycle management (7 days hot, 30 days warm, 90 days delete)
- **S3 Storage Classes:** Use Intelligent-Tiering for automatic cost optimization
- Document PII masking rules and privacy policies
- **Rationale:** Balance cost vs retention; CloudWatch Logs expensive long-term; S3 much cheaper; OpenSearch ILM reduces costs; leverage free tiers where possible

**8. SST Infrastructure-as-Code Integration**
- Add observability constructs to existing SST configuration
- Define environment-specific configurations (dev, staging, prod)
- Set up IAM roles and policies with least-privilege access
- Configure secrets management (AWS Secrets Manager) for tool credentials
- Implement cost tags on all resources for budget tracking story
- **Rationale:** Extend existing SST setup; proper IAM from start; cost tags enable budget monitoring for roadmap story

**9. Cost Optimization Considerations for MVP**
- Use Fargate Spot for non-critical workloads (Grafana in dev/staging)
- Right-size ECS tasks (start small: 0.5 vCPU, 1GB RAM)
- Configure auto-scaling with conservative limits
- Use CloudWatch Logs Insights instead of constant OpenSearch queries (pay-per-query)
- Leverage AWS Free Tier where applicable (CloudWatch, Lambda, S3, CloudFront)
- S3 Intelligent-Tiering moves data automatically to cheapest storage class
- Optimize CloudFront caching for tracking scripts to reduce origin requests
- **Rationale:** Budget is a concern; start lean and scale based on actual needs; CloudFront caching reduces costs; feeds into budgeting story

**10. Basic Team Access & Permissions**
- Configure AWS IAM for infrastructure access
- Create user accounts in OpenReplay, Umami, and Grafana
- Basic role-based access (admin vs viewer) for future team members
- Document how to access each tool
- Create quick-start guide for each tool
- **Rationale:** Proper access control; documentation for personal project sustainability

**11. Launch Readiness Validation**
- Verify tracking scripts load correctly in React/Vite app via CloudFront
- Test tracking scripts work in Vite dev mode and production build
- Confirm session recordings capture expected data and store in S3
- Test that Umami events fire properly
- Validate Grafana dashboards show real data from CloudWatch and OpenSearch
- Verify Lambda logs flowing to CloudWatch with structured format
- Test EMF custom metrics appearing in CloudWatch
- Load testing to confirm <50ms performance overhead from tracking scripts
- Validate S3 lifecycle policies trigger correctly
- Test CloudFront cache behavior for tracking assets
- Test SST deployment and rollback procedures
- Review first month's AWS bill to validate budget assumptions
- **Rationale:** Validate everything works; Vite build process requires testing; CloudFront caching needs validation; budget validation critical

### Out of Scope for MVP

- Prometheus deployment (CloudWatch sufficient for serverless)
- Multi-region deployment
- Advanced CloudWatch features (composite alarms, anomaly detection)
- Complex log parsing or ML-based log insights
- Advanced OpenReplay features (issue tracking, collaboration, custom events)
- Umami custom event tracking beyond page views
- Complex Grafana alerting rules (basic alerts OK in post-MVP)
- Cross-tool data correlation or unified dashboards
- AI/ML capabilities or anomaly detection (Phase 2 from brainstorming)
- Mobile app tracking
- Integration with support ticketing system
- Automated reporting or scheduled exports
- Advanced user segmentation or cohort analysis
- Performance budgets or SLO tracking (can add after baseline established)
- High availability or multi-AZ for observability stack
- Reserved Instances or Savings Plans (optimize after understanding usage patterns)
- CloudFront Functions or Lambda@Edge for advanced tracking

### MVP Success Criteria

The MVP will be considered successful when:

1. **SST infrastructure deploys successfully** extending existing configuration
2. **Lambda functions instrumented** with EMF custom metrics and structured logging
3. **CloudWatch receiving logs** from all Lambda functions with proper structured format
4. **OpenSearch indexing logs** and queryable via Grafana
5. **OpenReplay recording sessions** and storing to S3 with 30-day lifecycle
6. **Umami tracking pageviews** using schema in existing Aurora DB
7. **Grafana dashboards operational** showing Lambda, API Gateway, CloudFront, and frontend metrics
8. **100% of user sessions** captured by both OpenReplay and Umami at launch
9. **React/Vite app performance monitored** (Web Vitals tracked and visible)
10. **Tracking scripts load correctly** via CloudFront in both dev and production
11. **Product team can answer:** "Which pages get most traffic?" and "What's the typical user journey?"
12. **Engineering can:** View Lambda performance, cold starts, errors, CloudFront cache metrics, and query logs via Grafana
13. **CS team can:** Replay user sessions to troubleshoot reported issues
14. **PII masking verified** and working correctly across all recordings
15. **Performance overhead acceptable** (<50ms page load impact from tracking scripts measured)
16. **Data retention policies automated** (S3 lifecycle, OpenSearch ILM, CloudWatch retention)
17. **Cost tags applied** to all resources for budget tracking
18. **First month AWS costs reviewed** and within budget expectations
19. **SST stacks documented** and deployable independently

## Post-MVP Vision

### Phase 2 Features

**Advanced Analytics & Insights**
- Custom event tracking in Umami (button clicks, form submissions, feature-specific interactions)
- User journey funnels and conversion tracking
- Cohort analysis and user segmentation
- A/B test integration and experiment tracking
- Automated user journey mapping from OpenReplay data

**Enhanced Monitoring & Alerting**
- Grafana alerting rules for critical performance thresholds
- Anomaly detection on key metrics (traffic spikes, error rate changes)
- Integration with notification channels (Slack, email, SNS)
- Performance budgets and SLO tracking
- CloudWatch composite alarms for complex scenarios

**Cross-Tool Integration**
- Unified dashboards correlating session replays with performance metrics
- Automatic linking of error spikes to affected user sessions
- "Incident timeline" view combining logs, metrics, and session data
- Cost analysis dashboard with usage trends
- Integration with support ticketing system (GitHub Issues, Jira, etc.)

**AI/ML Capabilities** (Leveraging your team's openness to AI/ML)
- Automatic user frustration detection (rage clicks, rapid back-button usage)
- Predictive churn indicators based on behavior patterns
- AI-powered log analysis and error categorization
- Automated issue triage and session clustering
- Natural language queries for dashboards ("Show me slow checkout sessions this week")

### Long-Term Vision (1-2 Years)

**Complete Observability Platform**
Transform from three separate tools into a cohesive observability platform that provides:
- Single pane of glass for all product, engineering, and support insights
- Proactive issue detection and automated remediation suggestions
- Data-driven product decisions backed by comprehensive user behavior analytics
- Customer service excellence through instant issue reproduction and context

**Intelligence Layer**
- Machine learning models trained on your specific user behavior patterns
- Predictive analytics for user engagement and product success
- Automated insights delivered to stakeholders ("Traffic to feature X dropped 40% after deploy Y")
- Smart alerting that learns from false positives and improves over time

**Scale & Efficiency**
- Infrastructure optimized for cost at scale (Reserved Instances, Savings Plans)
- Automated cost optimization recommendations
- Multi-environment support (staging, production, A/B test variants)
- High availability and disaster recovery for observability stack

### Expansion Opportunities

**Mobile Application Support**
- Extend tracking to mobile apps (React Native, native iOS/Android)
- Cross-platform user journey tracking (web → mobile → web)
- Mobile-specific metrics (app performance, crash reporting, offline behavior)

**Advanced Privacy Features**
- User-controlled data sharing (opt-in for detailed tracking)
- GDPR/CCPA compliance automation
- Data anonymization pipelines
- Privacy dashboard for users to see what data is collected

**Developer Experience Enhancements**
- Real-time development metrics and feedback
- Integration with CI/CD pipelines (performance regression detection)
- Local development observability (Vite dev server integration)
- GitOps for dashboard and alert configuration

**Business Intelligence**
- Revenue correlation with user behavior metrics
- Customer lifetime value (CLV) prediction
- Feature adoption ROI analysis
- Competitive benchmarking against industry standards

## Technical Considerations

### Platform Requirements

**Target Platforms:** Web-based (React frontend on S3/CloudFront, serverless Lambda backend)

**Browser/OS Support:**
- Modern browsers with ES2020+ support (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)
- No IE11 support required (aligns with modern Vite/React stack)

**Performance Requirements:**
- Page load time: Target <2s for initial load (LCP metric)
- Tracking script overhead: <50ms impact on page load
- API response time: p95 <500ms for user-facing endpoints
- Cold start mitigation: Provisioned concurrency for critical Lambda functions (if needed post-launch)

### Technology Preferences

**Frontend:**
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite (already in use)
- **Hosting:** S3 + CloudFront distribution
- **Tracking Scripts:** OpenReplay and Umami client libraries integrated via npm
- **Performance Monitoring:** web-vitals library for Core Web Vitals

**Backend:**
- **Runtime:** Node.js 20.x on AWS Lambda (TypeScript compiled)
- **API:** API Gateway (REST or HTTP API)
- **Logging:** Structured logging with Pino or Winston
- **Metrics:** CloudWatch Embedded Metric Format (EMF)
- **Tracing:** AWS X-Ray (optional but recommended)

**Database:**
- **Primary:** Existing Aurora PostgreSQL (application data)
- **Umami:** Dedicated schema in Aurora PostgreSQL
- **OpenReplay:** PostgreSQL database (part of OpenReplay deployment)

**Infrastructure:**
- **IaC:** SST (Serverless Stack) in TypeScript
- **Container Orchestration:** ECS/Fargate for OpenReplay, Umami, Grafana
- **Metrics Storage:** CloudWatch (primary), Prometheus (if needed for advanced metrics)
- **Log Aggregation:** CloudWatch Logs → OpenSearch
- **Object Storage:** S3 with Intelligent-Tiering

### Architecture Considerations

**Repository Structure:**
- Extend existing monorepo with observability infrastructure
- SST constructs for observability stack in dedicated directory
- Shared TypeScript types for metrics and logging across Lambda functions

**Service Architecture:**
- Serverless-first: Lambda functions for all backend logic
- Containerized observability tools: ECS/Fargate for self-hosted components
- Event-driven where applicable: EventBridge, SNS, SQS for async processing

**Integration Requirements:**
- **Frontend → OpenReplay/Umami:** Client-side tracking scripts
- **Lambda → CloudWatch:** EMF for metrics, structured logs
- **CloudWatch → OpenSearch:** Log streaming via subscription filters
- **Grafana → CloudWatch/OpenSearch:** Data source integrations
- **API Gateway → CloudWatch:** Access logs and execution logs

**Security/Compliance:**
- **Data Privacy:** PII masking in session replays, GDPR-compliant analytics
- **Access Control:** IAM roles with least-privilege, SSO integration (future)
- **Secrets Management:** AWS Secrets Manager for credentials
- **Encryption:**
  - At rest: S3 server-side encryption, Aurora encryption
  - In transit: HTTPS/TLS for all communications
- **Network Security:** VPC for ECS services, security groups, NACLs

**Cost Considerations:**
- **Compute:** Lambda pay-per-use, ECS Fargate right-sized tasks, Fargate Spot for dev
- **Storage:** S3 Intelligent-Tiering, CloudWatch Logs export to S3, OpenSearch ILM
- **Data Transfer:** CloudFront caching to minimize origin requests
- **Database:** Leverage existing Aurora (no new RDS costs)
- **Monitoring:** CloudWatch free tier, cost tags for tracking

### Deployment Strategy

**Environments:**
- **Development:** Minimal infrastructure, short retention periods
- **Staging:** Production-like for testing (optional based on budget)
- **Production:** Full observability stack with proper retention

**CI/CD:**
- SST deployment via GitHub Actions or similar
- Automated testing before deployment
- Blue/green or canary deployments for Lambda functions
- Infrastructure changes reviewed and tested in dev first

**Rollback Plan:**
- SST stack versioning for easy rollback
- Lambda versions and aliases for function rollback
- Database migrations tested and reversible
- CloudFormation change sets reviewed before apply

## Constraints & Assumptions

### Constraints

**Budget:**
- Personal project budget - cost-conscious approach required
- AWS Free Tier utilized where applicable
- Observability infrastructure costs minimized through:
  - Right-sized ECS tasks (start at 0.5 vCPU, 1GB RAM)
  - S3 Intelligent-Tiering for automatic cost optimization
  - CloudWatch Logs export to S3 for long-term retention
  - OpenSearch ILM for index lifecycle management
  - Fargate Spot for non-production workloads
- Budgeting and cost limits story planned in roadmap
- Monthly cost monitoring and optimization ongoing

**Timeline:**
- Time is not a critical constraint (personal project flexibility)
- Launch readiness more important than arbitrary deadlines
- Allows for learning curve on new observability tools
- Can iterate and refine post-MVP based on actual usage

**Resources:**
- Single developer (personal project)
- No dedicated DevOps or platform engineering support
- Self-service for all infrastructure management and troubleshooting
- Documentation critical for future reference and sustainability
- Community support for open-source tools (OpenReplay, Umami, Grafana)

**Technical:**
- AWS-exclusive deployment (no multi-cloud)
- Serverless-first architecture (Lambda constraints apply)
  - 15-minute execution timeout
  - 10GB memory limit
  - Cold start considerations
- Existing Aurora PostgreSQL (no database migration)
- Existing SST configuration (extend, don't rebuild)
- React/Vite frontend (tracking must not break build process)
- CloudFront caching considerations for tracking scripts

**Infrastructure Sizing Recommendations (for <100 monthly users pre-launch):**

**VPC Configuration:**
- **CIDR Block:** /24 (256 IPs) or /23 (512 IPs) provides ample room
  - Example: 10.0.0.0/24 for single VPC approach
- **Subnets:**
  - 2 Public subnets (for NAT Gateways, bastion if needed): /27 each (32 IPs)
  - 2-3 Private subnets (for ECS tasks, Aurora): /26 each (64 IPs)
  - Recommendation: 10.0.0.0/27, 10.0.0.32/27 (public), 10.0.0.64/26, 10.0.0.128/26 (private)
- **Availability Zones:** Minimum 2 AZs for Aurora and ECS high availability
- **NAT Gateway:** 1 NAT Gateway for cost optimization (single AZ acceptable for pre-launch)
  - Note: Single NAT = $32/month, can add second NAT later for HA (~$64/month total)

**Aurora PostgreSQL Sizing:**
- **Type:** Aurora Serverless v2 vs Aurora Provisioned comparison:

  **Option 1: Aurora Serverless v2** (flexible but more expensive)
  - Auto-scales based on load (0.5-2 ACUs recommended)
  - Minimum: 0.5 ACU (1 GB RAM) = ~$0.12/hour = ~$90/month at minimum
  - For <100 users with Umami schema: will likely stay at 0.5-1 ACU
  - Best for: Variable traffic, hands-off scaling
  - Monthly cost: ~$90-120/month

  **Option 2: Aurora Provisioned** (budget-conscious - RECOMMENDED for <100 users)
  - db.t4g.micro (Graviton, 2 vCPU, 1 GB RAM): ~$12/month (1-year reserved) or ~$29/month (on-demand)
  - db.t3.micro (2 vCPU, 1 GB RAM): ~$15/month (1-year reserved) or ~$29/month (on-demand)
  - Sufficient for <100 users + application data + Umami schema
  - Can upgrade instance class later as traffic grows
  - Monthly cost: ~$12-32/month + storage (~$2.40/month for 20 GB)

- **Recommendation:** Start with Aurora Provisioned db.t4g.micro
  - Total: ~$15-32/month vs ~$90-120/month for Serverless v2
  - Savings: ~$60-90/month (can migrate to Serverless v2 when traffic justifies it)

- **Storage:** Start with 20 GB (Aurora minimum), auto-scales as needed (~$0.12/GB-month)
- **Backups:** 7-day retention sufficient for pre-launch (~$0.024/GB-month)

**ECS Task Sizing (for observability tools at <100 users):**

- **OpenReplay:**
  - Recommended: 0.5 vCPU, 1 GB RAM (start conservative)
  - Alternative: 1 vCPU, 2 GB RAM (if performance issues arise)
  - Fargate cost: ~$18/month (0.5 vCPU) or ~$35-40/month (1 vCPU)
  - Note: Can use Fargate Spot in dev (~$5-12/month with 70% savings)

- **Umami:**
  - Recommended: 0.25 vCPU, 512 MB RAM (very lightweight application)
  - Fargate cost: ~$9/month

- **Grafana:**
  - Recommended: 0.25 vCPU, 512 MB - 1 GB RAM
  - Fargate cost: ~$9-13/month

- **Total ECS/Fargate:** ~$36-62/month for all three tools (conservative sizing)

**Estimated Total Monthly AWS Cost (Observability Stack for <100 Users):**

**Budget-Optimized Scenario:**
- Aurora Provisioned db.t4g.micro: $15/month (1-yr reserved) + $2.40 storage = ~$17/month
- ECS/Fargate (conservative sizing): $36/month
- S3 (session replays, 30-day retention): $1-3/month
- CloudWatch Logs: $5-10/month
- OpenSearch (log indices): $5-10/month (incremental on existing)
- NAT Gateway (single AZ): $32/month
- **Total: ~$96-108/month**

**Standard Scenario:**
- Aurora Provisioned db.t4g.micro: $29/month (on-demand) + $2.40 storage = ~$31/month
- ECS/Fargate (moderate sizing): $50/month
- S3: $3-5/month
- CloudWatch: $10-15/month
- OpenSearch: $10/month
- NAT Gateway: $32/month
- **Total: ~$136-153/month**

**Higher-Cost Scenario (Aurora Serverless v2):**
- Aurora Serverless v2: $90-120/month
- ECS/Fargate: $50/month
- Other services: $50-65/month
- **Total: ~$190-235/month**

**Budget Optimization Strategies for <100 Users:**
1. ✅ **Use Aurora Provisioned db.t4g.micro** instead of Serverless v2 (saves ~$60-90/month)
2. ✅ **Start ECS tasks at minimum sizing** (0.25-0.5 vCPU) and scale up only if needed
3. ✅ **Use Fargate Spot for dev/staging** (70% cost savings)
4. ✅ **Single NAT Gateway initially** (saves $32/month vs dual AZ, acceptable for pre-launch)
5. ✅ **Aggressive CloudWatch Logs retention** (7 days dev, 30-90 days prod, export to S3)
6. ✅ **S3 Intelligent-Tiering** for automatic cost optimization
7. ✅ **Reserved Instances after 3 months** when usage patterns stable (saves 30-40%)
8. ⚠️ **Consider:** Pause dev environment ECS tasks when not in use (save ~50% of dev costs)

### Key Assumptions

**Infrastructure & Deployment:**
- AWS account with appropriate permissions exists
- VPC will be created or existing VPC can accommodate ECS services
- SST deployment experience sufficient to extend for observability
- Aurora instance (new or existing) can accommodate Umami schema with minimal storage impact (~100-500 MB for <100 users)
- CloudFront distribution configuration can be modified for tracking scripts

**Application Architecture:**
- Application is ready for instrumentation (code can be modified)
- Lambda functions can be updated with EMF and structured logging
- React app can integrate tracking scripts without breaking Vite build
- API Gateway is configured and can enable logging
- Application has identifiable user sessions for tracking

**User Base & Scale:**
- Initial launch with <100 monthly active users (very low traffic volume)
- User base growth gradual, not explosive
- Traffic patterns allow for cost-effective observability at small scale
- Small scale allows manual analysis initially (automation can come later)
- 100% session capture feasible with small user base

**Team & Adoption:**
- Product, Engineering, and CS teams willing to adopt new tools
- Stakeholders understand value of observability investment
- Teams will invest time in learning OpenReplay, Umami, and Grafana
- Feedback loop exists to improve dashboards and metrics based on usage
- Personal project allows for iteration without organizational bureaucracy

**Technical Capabilities:**
- TypeScript proficiency across frontend, backend, and infrastructure
- Comfortable with AWS services (Lambda, ECS, CloudWatch, S3, etc.)
- Can troubleshoot and maintain self-hosted tools
- Community resources and documentation sufficient for learning
- AI/ML capabilities can be added later (not required for MVP)

**Privacy & Security:**
- PII masking requirements are known and can be configured
- Self-hosted deployment sufficient for data privacy requirements
- No additional compliance requirements beyond basic GDPR principles
- Users accept reasonable tracking for service improvement
- No sensitive data beyond typical web application (no healthcare, financial, etc.)

**Cost & Growth:**
- Budget-optimized approach targets ~$100-150/month for observability stack
- Cost growth linear with user growth (can scale infrastructure as needed)
- Budget story in roadmap will address long-term cost management
- Reserved Instances/Savings Plans feasible once usage patterns known (3-6 months)
- Open-source tools eliminate licensing costs at scale

## Risks & Open Questions

### Key Risks

- **Cost Overrun:** Observability infrastructure costs exceed budget expectations
  - **Impact:** High - Could jeopardize project sustainability
  - **Mitigation:** Start with budget-optimized configuration (db.t4g.micro, minimal ECS sizing), implement cost alerts, monthly cost reviews, leverage budgeting story in roadmap

- **Complexity Overhead:** Managing three self-hosted tools (OpenReplay, Umami, Grafana) plus AWS infrastructure becomes overwhelming for single developer
  - **Impact:** Medium - Could slow feature development or lead to poor observability tool maintenance
  - **Mitigation:** Comprehensive documentation, start simple and add complexity gradually, consider managed alternatives if self-hosting becomes burden

- **Performance Impact:** Tracking scripts negatively affect user experience beyond acceptable thresholds
  - **Impact:** High - Poor UX could drive away early users
  - **Mitigation:** Rigorous performance testing pre-launch, async script loading, CloudFront caching, ability to disable/throttle tracking if needed

- **Data Storage Growth:** Session replays and logs consume more S3/storage than anticipated
  - **Impact:** Medium - Increases costs, potential data management issues
  - **Mitigation:** Aggressive retention policies (30 days replays, 90 days logs), S3 Intelligent-Tiering, OpenSearch ILM, monitoring storage metrics

- **Low Adoption:** Teams don't use observability tools despite investment
  - **Impact:** Medium - Wasted resources, missed insights
  - **Mitigation:** Training and onboarding, clear value demonstration, regular usage reviews, iterate dashboards based on feedback

- **PII Leak:** Session replays accidentally capture and store sensitive user data
  - **Impact:** High - Privacy violation, user trust damage, potential compliance issues
  - **Mitigation:** Comprehensive PII masking configuration, testing with real-like data, regular audits of recorded sessions, clear privacy policies

- **Integration Failures:** OpenReplay, Umami, or Grafana don't integrate smoothly with AWS services or existing application
  - **Impact:** Medium-High - Could delay launch or reduce functionality
  - **Mitigation:** Proof-of-concept testing before full deployment, fallback to CloudWatch-only solution if needed, community support resources

- **Single Point of Failure:** Observability infrastructure outage leaves team blind during critical issues
  - **Impact:** Low-Medium - Lose visibility but doesn't affect application itself
  - **Mitigation:** Multi-AZ deployment for critical components (Aurora), monitoring of monitoring (CloudWatch alarms on Grafana/tool health), documented manual debugging procedures

### Open Questions

**Infrastructure & Architecture:**
- Do we have an existing VPC or need to create one from scratch?
- What's the current Aurora instance size/type - can it handle Umami schema or need upgrade?
- Is API Gateway already configured for logging or needs enablement?
- Do we need VPN/bastion access to ECS tasks for debugging?
- Should we use Application Load Balancer for ECS services or direct service discovery?

**Application & Integration:**
- Which Lambda functions are most critical to instrument first?
- Are there existing custom metrics we want to preserve/migrate?
- How is user authentication handled - do we have consistent session IDs?
- What's the React app structure - single SPA or multiple entry points?
- Are there sensitive pages/forms that should exclude tracking entirely?

**Operational & Process:**
- Who has AWS account admin access for initial setup?
- What's the approval process for infrastructure changes?
- Do we need separate AWS accounts for dev/staging/prod or use single account with tags?
- What's the on-call/support model for observability infrastructure issues?
- How do we handle oncall rotation for personal project (N/A initially)?

**Cost & Budget:**
- What's the acceptable monthly budget ceiling for observability?
- Should we commit to 1-year Reserved Instances immediately or wait 3-6 months?
- Is there existing AWS spend we can optimize to offset observability costs?
- How do we track ROI of observability investment?

**Privacy & Compliance:**
- Are there specific PII fields beyond email/name/payment that need masking?
- Do we need user consent for session replay or is it covered by existing ToS?
- What's the data residency requirement (single AWS region acceptable)?
- Should users be able to opt-out of tracking?
- Do we need to provide data export/deletion capabilities (GDPR right to be forgotten)?

**Timeline & Sequencing:**
- What's the target launch date (or is it "when ready")?
- Should observability be deployed before launch or can it be added shortly after?
- What's the minimum viable observability (just Umami? Or all three tools)?
- Can we do phased rollout (Grafana first, then Umami, then OpenReplay)?

**Post-MVP Direction:**
- Which Phase 2 features are highest priority after MVP?
- Is mobile app tracking on the roadmap (affects architecture decisions)?
- Will this remain a personal project or potentially become commercial/team project?
- What's the expected user growth trajectory (10x in 6 months? 12 months? Slower)?

### Areas Needing Further Research

**Tool-Specific:**
- OpenReplay deployment best practices for ECS/Fargate (Docker configuration, resource requirements)
- Umami PostgreSQL schema size and query performance characteristics
- Grafana AWS data source plugin capabilities and limitations
- CloudWatch EMF best practices for Lambda with TypeScript

**AWS Services:**
- OpenSearch index size estimation for anticipated log volume
- CloudWatch Logs subscription filter performance and cost at scale
- ECS/Fargate auto-scaling configuration for observability workloads
- VPC endpoint costs for S3/CloudWatch (vs NAT Gateway data transfer)

**Integration Patterns:**
- Best way to correlate session IDs across OpenReplay, Umami, and application logs
- Grafana dashboard design patterns for serverless applications
- React/Vite integration methods for multiple tracking scripts without bundle bloat
- CloudFront cache header configuration for tracking scripts (maximize cache hit ratio)

**Cost Optimization:**
- Detailed breakdown of CloudWatch Logs costs at different ingestion rates
- S3 Intelligent-Tiering vs Glacier transition cost-benefit analysis
- Fargate Spot availability and interruption rates in target AWS region
- Cost comparison: self-hosted Grafana vs Grafana Cloud at <100 user scale

## Next Steps

### Immediate Actions

1. **Review and Validate Project Brief**
   - Review this document thoroughly
   - Answer open questions in Risks & Open Questions section
   - Validate cost estimates align with budget expectations
   - Confirm technical approach and infrastructure sizing recommendations

2. **Infrastructure Planning**
   - Audit existing AWS resources (VPC, Aurora, API Gateway configuration)
   - Determine if new VPC needed or can extend existing
   - Confirm Aurora instance type and available capacity for Umami schema
   - Document current AWS monthly spend baseline for cost comparison

3. **Proof of Concept (Recommended)**
   - Deploy minimal Grafana + CloudWatch integration to validate approach
   - Test OpenReplay Docker image locally or in dev environment
   - Install Umami tracking script in React app (dev mode) to verify Vite compatibility
   - Validate PII masking configuration with test data

4. **SST Configuration Design**
   - Design SST constructs for observability stack
   - Plan environment separation (dev/prod or single account with tags)
   - Define IAM roles and policies for all services
   - Create cost tags taxonomy for budget tracking

5. **Application Instrumentation Preparation**
   - Identify Lambda functions to instrument first (highest traffic/most critical)
   - Design CloudWatch EMF metric schema
   - Plan structured logging format (JSON schema)
   - Determine PII fields that need masking in session replays

6. **Cost Budget Approval**
   - Review estimated monthly costs ($96-153/month budget-optimized scenario)
   - Confirm budget ceiling and cost alert thresholds
   - Plan for initial 3-month trial period before committing to Reserved Instances
   - Set up AWS Budgets alerts before deployment

7. **Documentation Setup**
   - Create observability documentation directory in repo
   - Template for runbooks (deployment, rollback, troubleshooting)
   - Dashboard design documentation
   - Team training materials outline

### PM Handoff

This Project Brief provides the full context for **User Tracking & Metrics Implementation**.

**For Product Manager / Next Phase:**

This brief documents a comprehensive observability solution for a pre-launch serverless web application (<100 monthly users) using self-hosted open-source tools on AWS. The solution balances:

- **Cost consciousness:** ~$100-150/month budget-optimized approach
- **Technical capability:** Leveraging TypeScript/SST/serverless expertise
- **Privacy-first:** Self-hosted with PII masking
- **Multi-stakeholder value:** Product insights, engineering metrics, CS troubleshooting

**Key Decisions Made:**
- OpenReplay (session replay) + Umami (analytics) + Grafana (metrics visualization)
- AWS-exclusive serverless deployment (Lambda, ECS/Fargate, Aurora, S3, CloudWatch)
- Aurora Provisioned db.t4g.micro recommended over Serverless v2 (saves ~$60-90/month)
- CloudWatch EMF for metrics (no Prometheus needed for serverless)
- 30-day session replay retention, 1-year analytics retention

**Critical Success Factors:**
- Infrastructure deployed and validated before launch
- PII masking tested and working correctly
- Performance overhead <50ms measured
- Cost monitoring and alerts in place from day one
- Documentation for sustainability as personal project

**Open Questions to Address:**
- See "Risks & Open Questions" section for detailed list
- Most critical: VPC configuration, Aurora sizing validation, budget ceiling confirmation

**Recommended Next Steps:**
1. Answer open questions and validate assumptions
2. Run proof-of-concept for de-risking
3. Design SST infrastructure constructs
4. Create implementation plan with phasing (if not all-at-once)

**When ready to implement:**
- Work with development agent to create SST infrastructure
- Instrument Lambda functions with CloudWatch EMF
- Integrate tracking scripts into React/Vite frontend
- Deploy and validate observability stack
- Train team on tool usage

Please review thoroughly, ask clarifying questions, and decide whether to proceed with implementation or refine the approach further.

