# Brainstorming Session Results

**Session Date:** 2025-12-01  
**Facilitator:** Business Analyst Mary 📊  
**Participant:** Michael Menard  

---

## Executive Summary

**Topic:** Designing a pragmatic authorization model using AWS Cognito JWT (groups + scopes) that supports a freemium business model with usage-based limits for both frontend UI control and backend API authorization in a LEGO inventory platform

**Session Goals:** 
- Design a cost-effective authorization system for a small user base (<100 users)
- Create a freemium tier model that protects infrastructure costs
- Implement age-appropriate restrictions for chat features
- Balance simplicity with flexibility for future growth

**Techniques Used:** First Principles Thinking, Interactive Discovery

**Total Ideas Generated:** 40+ features, 3 tier models, 10+ edge cases identified

### Key Themes Identified:
- Cost protection is the primary driver (storage, bandwidth, compute)
- "Try everything in limited quantities" philosophy vs feature-locking
- Hybrid model: Usage quotas + feature locks + add-ons
- Privacy-respecting community features (discover people, not copyrighted content)
- Age restrictions critical for chat safety
- Admin role essential for maintainers

---

## Technique Sessions

### First Principles Thinking - 45 minutes

**Description:** Breaking down the authorization challenge to fundamental truths, building up without assumptions

#### Ideas Generated:

1. **Core Problem Identified:** Not building a SaaS empire, but controlling personal infrastructure costs
2. **User Base Reality:** Small community (<100 users), tool for personal use primarily
3. **Cost Drivers:** Large file storage (PDFs, images), database operations, API calls, price scraping APIs
4. **Philosophy Shift:** From "locked features" to "limited quantities of everything"
5. **Hybrid Monetization:** Usage quotas (metered) + feature locks (binary) + add-ons (modular)
6. **Three-Tier Structure:** Free (try everything), Pro (20x multiplier), Power (40x + unlimited set lists)
7. **Storage as Shared Resource:** All content types (MOCs, wishlists, galleries, set lists) share storage quota
8. **Add-on Model:** Price scraping and brick tracking as independent purchases
9. **Admin Bypass:** Maintainers need unlimited access, manual assignment only
10. **Age Restrictions:** Self-reported birthdate, computed is_minor flag, scope removal for minors

#### Insights Discovered:
- The app is fundamentally a **personal inventory tool** with community features, not a social platform
- **Copyrighted content** (purchased MOC instructions) means discovery must be people-focused, not content-focused
- **Cost recovery** is the goal, not profit maximization
- **Simplicity** is critical - avoid over-engineering for future scale that may never come
- **Cognito JWT limitations** require database state for quota tracking (stateless vs stateful split)

#### Notable Connections:
- Tier multipliers (20x, 40x) create clear upgrade value without complex pricing
- Shared storage quota simplifies user mental model ("I have 1GB total")
- Add-ons independent of tiers allow flexible monetization
- Age restrictions align with legal requirements (COPPA, GDPR) and safety concerns

---

## Feature Inventory

### Content Creation/Storage Features
1. MOC uploads (PDFs, images)
2. Wishlists (images, text)
3. Set lists (images, text) - Power tier only
4. Image galleries/collections
5. User profile/dashboard

### Social/Community Features
6. Group chat (general channel)
7. Theme-based chat channels (#castle-builders, #space-enthusiasts)
8. Direct messaging (1-on-1)
9. User discovery via theme matching
10. "Currently Building" status
11. Build logs/journals
12. Collection milestones ("Just hit 50 Castle MOCs!")
13. User reviews/ratings (text only, no files)
14. Wishlist sharing (public wishlists)
15. Network/following users
16. Build-specific chat rooms (temporary, per-MOC)

### Premium Features
17. Price scraping (BrickLink/BrickOwl API integration)
18. Brick purchase tracking
19. Realtime dashboard data (WebSocket)
20. App themes (cosmetic)
21. Advanced privacy controls (granular per-feature visibility)

### Privacy/Safety Features
22. Profile visibility settings (all tiers)
23. Age verification (birthdate)
24. Chat restrictions for minors
25. Profanity filter (toggleable for adults)
26. Report/block features
27. Content moderation tools (admin)

### Admin Features
28. User management (view, edit, delete users)
29. Content moderation (view, remove any content)
30. Chat moderation (view logs, remove messages, ban users)
31. Analytics dashboard (usage stats, signups, upgrades)
32. Configuration management (feature flags)

---

## Idea Categorization

### Immediate Opportunities
*Ideas ready to implement now*

1. **Three-Tier Model (Free/Pro/Power)**
   - Description: Simple tier structure with clear multipliers (5/100/200 MOCs, 50MB/1GB/2GB storage)
   - Why immediate: Core to entire authorization system, well-defined, technically feasible
   - Resources needed: Cognito configuration, database schema, Lambda function

2. **Cognito JWT with Groups + Scopes**
   - Description: Use Cognito groups for tiers, scopes for features, database for quotas
   - Why immediate: Leverages existing AWS infrastructure, industry-standard approach
   - Resources needed: AWS Cognito, PostgreSQL, Lambda trigger

3. **Database Quota Tracking**
   - Description: user_quotas table with usage counts, limits, and computed is_minor column
   - Why immediate: Essential for cost protection, straightforward implementation
   - Resources needed: PostgreSQL, migration scripts, API middleware

4. **API Authorization Middleware**
   - Description: JWT verification, scope checking, quota enforcement in API layer
   - Why immediate: Critical security layer, reusable across all endpoints
   - Resources needed: Node.js middleware, JWKS client, database connection

5. **Admin Role (Manual Assignment)**
   - Description: Admin group in Cognito, manually assigned, bypasses all quotas
   - Why immediate: Needed for you to manage the app, simple to implement
   - Resources needed: Cognito console access, admin scope definitions

### Future Innovations
*Ideas requiring development/research*

6. **Theme-Based User Discovery**
   - Description: Match users by collection theme percentages (45% Castle, 30% Pirates)
   - Development needed: Algorithm for similarity matching, privacy controls, UI design
   - Timeline estimate: 2-3 weeks after MVP

7. **"Currently Building" Feature**
   - Description: Users mark MOCs as in-progress, discover others building same MOC
   - Development needed: Build status tracking, notifications, build buddy matching
   - Timeline estimate: 3-4 weeks after MVP

8. **Chat with History Limits**
   - Description: Pro tier gets 30-day history, Power gets 365-day history
   - Development needed: Chat infrastructure, message storage, query optimization
   - Timeline estimate: 4-6 weeks after MVP

9. **Price Scraping Add-on**
   - Description: Automatic price calculation for MOC builds via BrickLink/BrickOwl APIs
   - Development needed: API integrations, rate limiting, caching, error handling
   - Timeline estimate: 2-3 weeks, depends on external API complexity

10. **Advanced Privacy Controls (Power Tier)**
    - Description: Granular per-feature visibility, custom network tiers, anonymous browsing
    - Development needed: Complex UI, database schema for privacy settings, enforcement logic
    - Timeline estimate: 3-4 weeks after basic privacy controls

### Moonshots
*Ambitious, transformative concepts*

11. **AI-Powered Content Moderation**
    - Description: Automated chat moderation, profanity detection, abuse prevention
    - Transformative potential: Scales moderation without human intervention, safer community
    - Challenges to overcome: AI accuracy, false positives, cost of AI APIs, training data

12. **Subscription Management with Auto-Tier Assignment**
    - Description: Stripe/PayPal integration, automatic tier upgrades on payment, self-service
    - Transformative potential: Fully automated monetization, no manual intervention
    - Challenges to overcome: Payment integration complexity, webhook reliability, refund handling

13. **Team/Family Accounts with Shared Quotas**
    - Description: Multiple users share a storage pool, collaborative collections
    - Transformative potential: Expands use case to families and LEGO clubs
    - Challenges to overcome: Permission model complexity, quota sharing logic, billing changes

14. **Dynamic Pricing / Pay-As-You-Go Storage**
    - Description: Flexible pricing beyond tiers (e.g., $0.10/GB over limit, a la carte features)
    - Transformative potential: Maximizes revenue, users pay for exactly what they use
    - Challenges to overcome: Billing complexity, user confusion, cost prediction difficulty

### Insights & Learnings
*Key realizations from the session*

- **Cognito's stateless JWT requires database for quotas**: JWT can say "you're allowed" but not "you've used 3 of 5" - that's stateful and needs database tracking

- **Age restrictions must remove scopes, not just block at API**: Cleaner to not assign chat:participate scope to minors than to check is_minor flag on every request

- **Admin bypass simplifies logic**: Checking `if (isAdmin()) return true` at the start of every authorization function avoids complex conditional logic

- **Shared storage quota is simpler than per-feature quotas**: Users understand "I have 1GB total" better than "50MB for MOCs, 30MB for wishlists, 20MB for galleries"

- **Multipliers (20x, 40x) create clear value**: Easy to communicate "Pro gives you 20x everything" vs explaining individual limits

- **Privacy-respecting discovery is possible**: Can match users by theme percentages without exposing copyrighted MOC files

- **Edge cases are numerous**: Race conditions, quota drift, tier downgrades, JWT expiration, database sync issues - need comprehensive error handling

- **Start conservative on quotas**: Easier to increase limits later than decrease them (user backlash)

- **Freemium model requires careful balance**: Too restrictive = no signups, too generous = no upgrades, need data to optimize

- **Small user base changes priorities**: Don't over-engineer for scale, focus on cost control and simplicity

---

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: Implement Core Authorization System (Cognito + Database + Middleware)

**Rationale:** Foundation for everything else, blocks all other work, highest risk if done wrong

**Next steps:**
1. Create database schema (user_quotas table)
2. Configure Cognito User Pool with groups
3. Implement Pre Token Generation Lambda
4. Build API authorization middleware
5. Test with all tiers (Free, Pro, Power, Admin)

**Resources needed:**
- AWS account with Cognito access
- PostgreSQL database
- Node.js development environment
- 2-3 weeks development time

**Timeline:** Weeks 1-3 (Phase 1-2 from PRD)

#### #2 Priority: Frontend UI Feature Gating

**Rationale:** Users need to see tier differences, upgrade prompts drive monetization

**Next steps:**
1. Parse JWT and extract scopes/groups
2. Create hasScope() utility function
3. Hide/show features based on scopes
4. Display quota usage indicators
5. Implement upgrade prompts with clear CTAs

**Resources needed:**
- Frontend framework (React/Vue/etc.)
- JWT parsing library
- UI components for upgrade prompts
- 1 week development time

**Timeline:** Week 5 (Phase 3 from PRD)

#### #3 Priority: Age Restrictions for Chat

**Rationale:** Legal compliance (COPPA, GDPR), safety concerns, blocks chat feature launch

**Next steps:**
1. Add birthdate field to signup
2. Implement is_minor computed column
3. Update Lambda to remove chat scopes for minors
4. Hide chat UI for users without chat:participate scope
5. Add age restriction messaging

**Resources needed:**
- Database migration for birthdate column
- Lambda update
- Frontend conditional rendering
- 1 week development time

**Timeline:** Week 6 (Phase 4 from PRD)

---

## Reflection & Follow-up

### What Worked Well
- First principles thinking revealed the true problem (cost control, not feature richness)
- Interactive questioning uncovered hidden requirements (copyrighted content, age restrictions)
- Hybrid model (quotas + features + add-ons) emerged naturally from constraints
- Tier multipliers (20x, 40x) simplified pricing model
- Comprehensive edge case exploration prevented future bugs

### Areas for Further Exploration
- **Pricing validation**: Need to calculate actual AWS costs per user to set tier prices
- **User research**: Test quota limits with real users (are 5 MOCs enough to evaluate the app?)
- **Chat infrastructure**: Which chat solution? (WebSocket, third-party like Stream/PubNub, or custom?)
- **Payment integration**: Stripe vs PayPal vs other? Subscription vs one-time?
- **Moderation strategy**: How much manual moderation is feasible for <100 users?
- **Growth strategy**: Is growth even desired, or is this purely a personal tool?

### Recommended Follow-up Techniques
- **SCAMPER Method**: Apply to pricing model (Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse)
- **Assumption Reversal**: Challenge "users must pay for more storage" - what if storage was free but features cost money?
- **Stakeholder Roundtable**: Interview potential users (LEGO enthusiasts) about willingness to pay
- **Five Whys**: Dig deeper into "why age restrictions?" to ensure compliance strategy is sound

### Questions That Emerged
- What happens if AWS costs exceed revenue? Kill switch? Hard caps?
- Should there be a "lifetime" tier (one-time payment for unlimited)?
- How to handle users who abuse the system (upload spam, excessive storage)?
- What's the upgrade conversion funnel? (Free → Pro → Power, or Free → Power directly?)
- Should there be a trial period for paid tiers? (7-day free Pro trial?)
- How to communicate tier differences without overwhelming users?
- What analytics are needed to optimize tier limits and pricing?
- Should there be a "pause subscription" option (retain data, lose access)?

### Next Session Planning
- **Suggested topics:** 
  - Pricing strategy deep-dive (cost analysis, competitor research, willingness-to-pay)
  - Chat infrastructure selection (build vs buy, feature requirements)
  - User onboarding flow (signup → tier selection → first MOC upload)
  
- **Recommended timeframe:** After Phase 1-2 implementation (4-6 weeks), when real cost data is available

- **Preparation needed:** 
  - Gather AWS cost estimates for storage, bandwidth, Lambda, database
  - Research competitor pricing (Rebrickable, BrickLink, other LEGO apps)
  - Create prototype UI mockups for tier comparison page

---

*Session facilitated using the BMAD-METHOD™ brainstorming framework*

