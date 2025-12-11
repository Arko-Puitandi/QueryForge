# API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
Currently, the API does not require authentication. For production deployment, implement JWT or OAuth2.

---

## Session Endpoints

### Save Session State
Persist current session state (schema, preferences) to the server.

**Endpoint:** `POST /session/state`

**Request Body:**
```json
{
  "currentSchema": { ... },
  "selectedDatabase": "postgresql",
  "selectedLanguage": "nodejs"
}
```

### Get Session State
Retrieve saved session state.

**Endpoint:** `GET /session/state`

---

## Schema Endpoints

### Generate Schema
Generate a database schema from natural language description.

**Endpoint:** `POST /schema/generate`

**Request Body:**
```json
{
  "description": "E-commerce platform with users, products, and orders",
  "databaseType": "postgresql",
  "options": {
    "includeTimestamps": true,
    "includeSoftDelete": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "schema": {
      "name": "E-commerce Schema",
      "tables": [...],
      "relationships": [...]
    },
    "sql": "CREATE TABLE users (...)"
  }
}
```

### Optimize Schema
Optimize an existing schema with AI suggestions.

**Endpoint:** `POST /schema/optimize`

### Get Schema Templates
**Endpoint:** `GET /schema/templates?databaseType=postgresql`

---

## Visual Designer Endpoints

### Save Visual Designer Schema
**Endpoint:** `POST /visual-designer/schemas`

**Request Body:**
```json
{
  "name": "My Schema",
  "description": "Schema description",
  "databaseType": "postgresql",
  "tables": [...],
  "tablePositions": { "users": { "x": 100, "y": 100 } }
}
```

### Get All Schemas
**Endpoint:** `GET /visual-designer/schemas`

### Update Schema
**Endpoint:** `PUT /visual-designer/schemas/:id`

### Delete Schema
**Endpoint:** `DELETE /visual-designer/schemas/:id`

---

## Query Endpoints

### Generate Query
Convert natural language to SQL query.

**Endpoint:** `POST /query/generate`

**Request Body:**
```json
{
  "naturalLanguage": "Get all users who placed orders in the last 30 days",
  "schema": {...},
  "databaseType": "postgresql"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sql": "SELECT DISTINCT u.* FROM users u...",
    "explanation": "This query retrieves...",
    "tables": ["users", "orders"]
  }
}
```

### Analyze Query
Get performance analysis and optimization suggestions.

**Endpoint:** `POST /query/analyze`

**Request Body:**
```json
{
  "query": "SELECT * FROM users WHERE email = 'test@example.com'",
  "databaseType": "postgresql"
}
```

---

## Code Generation Endpoints

### Generate Code
Generate application code from schema.

**Endpoint:** `POST /code/generate`

**Request Body:**
```json
{
  "schema": {...},
  "language": "nodejs",
  "framework": "express",
  "options": {
    "includeRepository": true,
    "includeService": true,
    "includeController": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "User.ts",
        "path": "src/models/User.ts",
        "content": "...",
        "type": "entity"
      }
    ],
    "language": "nodejs",
    "framework": "express"
  }
}
```

---

## History Endpoints

### Get Schema History
**Endpoint:** `GET /history/schemas?limit=50&offset=0`

### Get Query History
**Endpoint:** `GET /history/queries?limit=50&offset=0`

### Get Code Generation History
**Endpoint:** `GET /history/code?limit=50&offset=0`

### Delete History Entry
**Endpoint:** `DELETE /history/{type}/{id}`

---

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
```

### Generate Schema (Streaming)
```javascript
ws.send(JSON.stringify({
  type: 'generateSchema',
  payload: {
    description: "...",
    databaseType: "postgresql"
  },
  requestId: "unique-request-id"
}));
```

### Progress Updates
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'progress') {
    console.log(`Step ${message.payload.step}/${message.payload.totalSteps}`);
  }
};
```

---

## Error Responses

All endpoints follow this error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes
- `INVALID_INPUT` - Request validation failed
- `SCHEMA_REQUIRED` - Schema is required for this operation
- `LLM_KEYS_EXHAUSTED` - AI API rate limit exceeded
- `GENERATION_FAILED` - AI generation failed
- `DATABASE_ERROR` - Database operation failed
