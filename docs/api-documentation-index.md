# API Documentation Index

**Last Updated:** 2025-12-01  
**Version:** 1.0.0

---

## 📚 API Documentation Overview

This index provides quick access to all API-related documentation for the LEGO Inventory Platform.

---

## Core API Documents

### 1. [API Specification (OpenAPI 3.0)](./api-spec.yaml)
**Format:** YAML  
**Purpose:** Machine-readable API specification  
**Use Cases:**
- Generate client SDKs (TypeScript, Python, etc.)
- Import into Postman/Insomnia for testing
- View in Swagger UI for interactive documentation
- Validate API requests/responses

**Quick Start:**
```bash
# View in Swagger Editor
open https://editor.swagger.io/
# Then paste the contents of api-spec.yaml

# Generate TypeScript SDK
openapi-generator-cli generate \
  -i docs/api-spec.yaml \
  -g typescript-fetch \
  -o client-sdk/typescript
```

---

### 2. [API Implementation Guide](./api-implementation-guide.md)
**Format:** Markdown  
**Purpose:** Comprehensive guide for implementing and using the API  
**Sections:**
- Authentication flow (login, token refresh, JWT structure)
- Authorization patterns (scope checking, tier validation)
- Error handling (standard formats, quota errors, storage errors)
- Rate limiting (by tier, headers, retry strategies)
- File upload strategy (two-step process, quota checking)
- Testing examples (Jest, cURL, Postman)
- Client SDK generation
- API versioning strategy

**Best For:** Developers implementing API endpoints or building client applications

---

### 3. [API Quick Reference](./api-quick-reference.md)
**Format:** Markdown  
**Purpose:** One-page cheat sheet for all endpoints  
**Contents:**
- All endpoints with request/response examples
- Scope requirements by tier
- Quota limits by tier
- Common error codes
- Rate limits

**Best For:** Quick lookups while coding

---

## Related Documents

### [Authorization System PRD](./prd/epic-authorization-system.md)
**Purpose:** Complete Product Requirements Document for the authorization system  
**Relevant Sections:**
- Section 4: Technical Architecture (Cognito, scopes, database)
- Section 5: Scope Assignment Matrix
- Section 6: Lambda Implementation
- Section 7: API Middleware
- Section 9: Edge Cases

**Best For:** Understanding the authorization model that powers the API

---

### [Brainstorming Session Results](./brainstorming-session-results.md)
**Purpose:** Design decisions and feature prioritization  
**Relevant Sections:**
- Feature inventory (40+ features)
- Tier structure rationale
- Key insights and learnings

**Best For:** Understanding the "why" behind API design decisions

---

## Quick Navigation

### By Role

**Backend Developers:**
1. Start: [API Specification](./api-spec.yaml)
2. Implement: [API Implementation Guide](./api-implementation-guide.md) - Sections 2-6
3. Reference: [API Quick Reference](./api-quick-reference.md)

**Frontend Developers:**
1. Start: [API Implementation Guide](./api-implementation-guide.md) - Sections 1-3
2. Generate SDK: Use [API Specification](./api-spec.yaml) with OpenAPI Generator
3. Reference: [API Quick Reference](./api-quick-reference.md)

**Product Managers:**
1. Start: [Authorization System PRD](./prd/epic-authorization-system.md) - Sections 1-2
2. Review: [Brainstorming Session Results](./brainstorming-session-results.md)
3. Reference: [API Quick Reference](./api-quick-reference.md) - Scopes and Quotas tables

---

### By Task

**Implementing Authentication:**
- [API Implementation Guide](./api-implementation-guide.md) - Section 2: Authentication Flow
- [Authorization System PRD](./prd/epic-authorization-system.md) - Section 6: Lambda Implementation

**Implementing Authorization:**
- [API Implementation Guide](./api-implementation-guide.md) - Section 3: Authorization Patterns
- [Authorization System PRD](./prd/epic-authorization-system.md) - Section 7: API Middleware

**Handling Errors:**
- [API Implementation Guide](./api-implementation-guide.md) - Section 4: Error Handling
- [API Specification](./api-spec.yaml) - Error schemas

**Implementing File Uploads:**
- [API Implementation Guide](./api-implementation-guide.md) - Section 6: File Upload Strategy
- [API Specification](./api-spec.yaml) - `/mocs/{id}/files` endpoint

**Testing the API:**
- [API Implementation Guide](./api-implementation-guide.md) - Section 7: Testing the API
- [API Specification](./api-spec.yaml) - Import into Postman

**Generating Client SDKs:**
- [API Implementation Guide](./api-implementation-guide.md) - Section 8: Client SDK Generation
- [API Specification](./api-spec.yaml) - Source file for generation

---

## API Endpoints Summary

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token

### Quotas
- `GET /quotas/me` - Get current user's quota information

### MOCs
- `GET /mocs` - List MOCs
- `POST /mocs` - Create MOC
- `GET /mocs/{id}` - Get MOC
- `PUT /mocs/{id}` - Update MOC
- `DELETE /mocs/{id}` - Delete MOC
- `POST /mocs/{id}/files` - Upload file
- `DELETE /mocs/{id}/files/{fileId}` - Delete file

### Wishlists
- `GET /wishlists` - List wishlists
- `POST /wishlists` - Create wishlist

### Galleries (Pro/Power only)
- `GET /galleries` - List galleries
- `POST /galleries` - Create gallery

### Set Lists (Power only)
- `GET /setlists` - List set lists
- `POST /setlists` - Create set list

### Users
- `GET /users/me` - Get my profile
- `PUT /users/me` - Update my profile
- `GET /users/discover` - Discover similar users (Pro/Power)
- `GET /users/{userId}` - Get user profile

### Reviews (Pro/Power only)
- `GET /reviews` - List reviews
- `POST /reviews` - Create review

### Chat (Pro/Power only, 18+)
- `GET /chat/channels` - List channels
- `GET /chat/channels/{channelId}/messages` - Get messages
- `POST /chat/channels/{channelId}/messages` - Send message

### Admin (Admin only)
- `GET /admin/users` - List all users
- `GET /admin/users/{userId}` - Get user details
- `PUT /admin/users/{userId}` - Update user
- `DELETE /admin/users/{userId}` - Delete user
- `GET /admin/content/mocs` - List all MOCs
- `DELETE /admin/content/mocs/{id}` - Delete any MOC
- `GET /admin/chat/messages` - View all chat messages
- `DELETE /admin/chat/messages/{messageId}` - Delete message
- `GET /admin/analytics` - Get platform analytics

**Full details:** See [API Quick Reference](./api-quick-reference.md)

---

## Tools and Resources

### Viewing the API Spec

**Swagger Editor (Online):**
```
1. Go to https://editor.swagger.io/
2. File → Import File → Select docs/api-spec.yaml
3. View interactive documentation
```

**Swagger UI (Local):**
```bash
npm install -g swagger-ui-watcher
swagger-ui-watcher docs/api-spec.yaml
# Open http://localhost:8080
```

**Postman:**
```
1. Open Postman
2. Import → Upload Files → Select docs/api-spec.yaml
3. Collection will be auto-generated
```

### Generating Client SDKs

**TypeScript:**
```bash
openapi-generator-cli generate \
  -i docs/api-spec.yaml \
  -g typescript-fetch \
  -o client-sdk/typescript
```

**Python:**
```bash
openapi-generator-cli generate \
  -i docs/api-spec.yaml \
  -g python \
  -o client-sdk/python
```

**Other Languages:**
See [OpenAPI Generator](https://openapi-generator.tech/docs/generators) for full list of supported languages.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-01 | Initial API specification and documentation |

---

## Next Steps

1. **Review the API Specification** in Swagger Editor
2. **Read the Implementation Guide** for your role (backend/frontend)
3. **Set up your development environment** (Cognito, database, Node.js)
4. **Generate a client SDK** if building a frontend
5. **Start implementing** following the guide
6. **Test using Postman** or cURL examples
7. **Reference the Quick Reference** while coding

---

**Questions?** Refer to the [API Implementation Guide](./api-implementation-guide.md) for detailed explanations.

