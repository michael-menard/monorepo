---
sidebar_position: 2
---

# API Reference

The LEGO MOC Instructions API provides comprehensive endpoints for managing MOCs, users, and platform data.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "status": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string"
    },
    "token": "string"
  }
}
```

#### POST /auth/login
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string"
    },
    "token": "string"
  }
}
```

### MOCs (My Own Creations)

#### GET /mocs
Get a list of MOCs with optional filtering.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `category` (string): Filter by category
- `difficulty` (string): Filter by difficulty level
- `search` (string): Search in title and description

**Response:**
```json
{
  "status": 200,
  "message": "MOCs retrieved successfully",
  "data": {
    "mocs": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "category": "string",
        "difficulty": "string",
        "author": {
          "id": "string",
          "username": "string"
        },
        "createdAt": "string",
        "updatedAt": "string"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

#### POST /mocs
Create a new MOC (requires authentication).

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "difficulty": "string",
  "instructions": "string",
  "parts": [
    {
      "partNumber": "string",
      "quantity": "number",
      "color": "string"
    }
  ]
}
```

#### GET /mocs/:id
Get a specific MOC by ID.

**Response:**
```json
{
  "status": 200,
  "message": "MOC retrieved successfully",
  "data": {
    "moc": {
      "id": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "difficulty": "string",
      "instructions": "string",
      "parts": [],
      "images": [],
      "author": {
        "id": "string",
        "username": "string"
      },
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
}
```

### Gallery

#### GET /gallery
Get gallery images with optional filtering.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Number of items per page
- `category` (string): Filter by category
- `author` (string): Filter by author ID

#### POST /gallery
Upload a new image to the gallery (requires authentication).

**Request Body:**
```form-data
{
  "image": "file",
  "title": "string",
  "description": "string",
  "category": "string",
  "tags": ["string"]
}
```

### Wishlist

#### GET /wishlist
Get user's wishlist (requires authentication).

#### POST /wishlist
Add item to wishlist (requires authentication).

**Request Body:**
```json
{
  "itemType": "set|part",
  "itemId": "string",
  "priority": "low|medium|high"
}
```

### User Profile

#### GET /profile
Get current user's profile (requires authentication).

#### PUT /profile
Update user profile (requires authentication).

**Request Body:**
```json
{
  "username": "string",
  "bio": "string",
  "location": "string",
  "website": "string"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "status": 400,
  "message": "Error description",
  "error": "Detailed error information"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

## SDKs and Libraries

We provide official SDKs for popular platforms:

- **JavaScript/TypeScript**: `@lego-moc/sdk`
- **Python**: `lego-moc-python`
- **React Hook**: `@lego-moc/react-hook`

## Support

For API support and questions:
- **Documentation**: This site
- **GitHub Issues**: Report bugs or request features
- **Discord**: Join our developer community 