# API Specification

The migrated API maintains 100% backward compatibility with the existing Express.js API. All endpoints, request/response formats, and authentication mechanisms remain unchanged from the client perspective.

## API Style: REST (HTTP JSON API)

## Base URLs

- **Development**: `https://dev-api.lego-moc.example.com`
- **Staging**: `https://staging-api.lego-moc.example.com`
- **Production**: `https://api.lego-moc.example.com`

## Authentication

**Method**: JWT Bearer Token (AWS Cognito)

**Header**: `Authorization: Bearer <jwt-token>`

**Alternative**: Cookie-based auth (`token` cookie)

**Token Claims**:

- `sub`: Cognito user ID
- `email`: User email
- `iss`: Token issuer (Cognito User Pool)
- `exp`: Expiration timestamp

## OpenAPI 3.0 Specification (Core Endpoints)

```yaml
openapi: 3.0.0
info:
  title: LEGO Projects API - Serverless
  version: 2.0.0
  description: Serverless RESTful API for managing LEGO MOC instructions, gallery images, and wishlists
servers:
  - url: https://api.lego-moc.example.com
    description: Production
  - url: https://staging-api.lego-moc.example.com
    description: Staging

security:
  - BearerAuth: []

paths:
  /health:
    get:
      summary: Health check endpoint
      operationId: healthCheck
      security: []
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [healthy, degraded, unhealthy]
                  service:
                    type: string
                  components:
                    type: object
                    properties:
                      database:
                        type: string
                        enum: [healthy, unhealthy]
                      redis:
                        type: string
                        enum: [healthy, unhealthy]
                      opensearch:
                        type: string
                        enum: [healthy, unhealthy]

  /api/mocs:
    get:
      summary: List all MOC instructions for authenticated user
      operationId: listMOCs
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: search
          in: query
          schema:
            type: string
        - name: tag
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List of MOCs
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/MOCInstruction'
                  total:
                    type: integer
                  page:
                    type: integer
    post:
      summary: Create a new MOC instruction
      operationId: createMOC
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - title
                - type
              properties:
                title:
                  type: string
                type:
                  type: string
                  enum: [moc, set]
                description:
                  type: string
                author:
                  type: string
                partsCount:
                  type: integer
                theme:
                  type: string
      responses:
        '201':
          description: MOC created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/MOCInstruction'

  /api/mocs/{id}:
    get:
      summary: Get MOC instruction details
      operationId: getMOC
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: MOC details
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/MOCInstructionDetail'
    patch:
      summary: Update MOC instruction
      operationId: updateMOC
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                title:
                  type: string
                description:
                  type: string
      responses:
        '200':
          description: MOC updated
    delete:
      summary: Delete MOC instruction
      operationId: deleteMOC
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: MOC deleted

  /api/images:
    post:
      summary: Upload a gallery image
      operationId: uploadImage
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - image
              properties:
                image:
                  type: string
                  format: binary
                title:
                  type: string
                description:
                  type: string
                tags:
                  type: array
                  items:
                    type: string
                albumId:
                  type: string
                  format: uuid
      responses:
        '201':
          description: Image uploaded successfully

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    MOCInstruction:
      type: object
      required:
        - id
        - userId
        - title
        - type
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
        title:
          type: string
        description:
          type: string
        type:
          type: string
          enum: [moc, set]
        thumbnailUrl:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    MOCInstructionDetail:
      allOf:
        - $ref: '#/components/schemas/MOCInstruction'
        - type: object
          properties:
            files:
              type: array
              items:
                type: object
            images:
              type: array
              items:
                type: object
            partsLists:
              type: array
              items:
                type: object
```

_(Full OpenAPI spec available in `docs/openapi.yaml` after migration)_

---
