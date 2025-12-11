# System Architecture

## Overview

QueryForge is a full-stack web application built with React (frontend) and Express (backend), powered by Google Gemini AI for intelligent database schema generation, query optimization, and code generation. The application follows a **schema-first architecture** where all features depend on the currently loaded schema.

---

## Key Architectural Principles

### 1. Schema-First Architecture
- Every feature requires a loaded schema to function
- Pages validate schema presence before allowing operations
- Schema changes are confirmed via modal dialogs to prevent accidental data loss
- All state is synchronized with the server (no localStorage for critical data)

### 2. Server-Side State Management
- All schemas, queries, and code generations are persisted to SQLite database
- Session state (current schema, preferences) synced to server
- Client state managed via Zustand with server sync middleware

### 3. Professional UI/UX
- Custom modal system (ConfirmModal, SchemaChangeModal) instead of browser dialogs
- Real-time feedback via WebSocket for long-running operations
- Command palette for keyboard-first navigation

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Schema       │  │ Query        │  │ Code         │         │
│  │ Builder      │  │ Generator    │  │ Generator    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Visual       │  │ Template     │  │ History      │         │
│  │ Designer     │  │ Generator    │  │ Manager      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │         Zustand State Management                   │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │         API Services (Axios + WebSocket)           │        │
│  └────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    REST API + WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Express.js)                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Controllers  │  │ Middleware   │  │ Routes       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Core Services                        │          │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │          │
│  │  │ Schema   │ │  Query   │ │   Code   │         │          │
│  │  │Generator │ │Generator │ │Generator │         │          │
│  │  └──────────┘ └──────────┘ └──────────┘         │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │          Gemini AI Service (LLM)                 │          │
│  │  - Multi-key rotation                            │          │
│  │  - Rate limiting                                 │          │
│  │  - Prompt engineering                            │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │        WebSocket Server                          │          │
│  │  - Real-time progress updates                    │          │
│  │  - Streaming responses                           │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │        SQLite Database                           │          │
│  │  - Schema history                                │          │
│  │  - Query history                                 │          │
│  │  - Code generation history                       │          │
│  │  - Visual designer schemas                       │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Google Gemini API
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Google Gemini 2.0 Flash                      │
│  - Natural language processing                                 │
│  - Code generation                                              │
│  - Query optimization                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **WebSocket**: Native WebSocket API
- **Code Highlighting**: React Syntax Highlighter

### Directory Structure
```
client/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmModal.tsx    # Confirmation dialogs
│   │   │   ├── SchemaChangeModal.tsx # Schema change confirmations
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── Notification.tsx
│   │   │   ├── AIChatAssistant.tsx
│   │   │   └── CommandPalette.tsx
│   │   ├── code/            # Code generation components
│   │   ├── database/        # Database connection UI
│   │   ├── layout/          # Layout components (Header, Sidebar, MainLayout)
│   │   ├── query/           # Query builder components
│   │   │   ├── QueryCanvas.tsx       # Visual query canvas
│   │   │   ├── FilterPanel.tsx       # WHERE clause builder
│   │   │   ├── PreviewPanel.tsx      # SQL preview
│   │   │   ├── JoinEditor.tsx        # JOIN management
│   │   │   └── AdvancedSQLFeatures.tsx
│   │   ├── schema/          # Schema builder components
│   │   │   ├── VisualSchemaDesigner.tsx  # React Flow canvas
│   │   │   ├── TableEditor.tsx       # Table/column editor
│   │   │   ├── SchemaUploader.tsx    # SQL/JSON import
│   │   │   └── MockDataGenerator.tsx
│   │   └── voice/           # Voice input components
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   │   ├── DashboardPage.tsx
│   │   ├── SchemaPage.tsx
│   │   ├── VisualDesignerPage.tsx
│   │   ├── VisualQueryBuilderPage.tsx
│   │   ├── QueryPage.tsx
│   │   ├── CodePage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/            # API service layer
│   │   ├── api.ts           # REST API calls
│   │   ├── websocket.ts     # WebSocket client
│   │   └── sessionService.ts # Server session management
│   ├── stores/              # Zustand state stores
│   │   ├── appStore.ts      # Main app state with server sync
│   │   ├── notificationStore.ts
│   │   └── visualQueryStore.ts
│   ├── styles/              # Global styles
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
└── public/                  # Static assets
```

### State Management (Zustand)

**appStore.ts** - Global application state with server sync:
- Current schema (synced to server)
- Selected database type
- Selected language
- Generated queries and code
- Loading states
- UI preferences
- Schema change confirmation handling

**visualQueryStore.ts** - Visual Query Builder state:
- Current query structure
- Selected tables and columns
- Joins, filters, grouping
- Query options (DISTINCT, LIMIT, etc.)

**notificationStore.ts** - Notification system:
- Toast notifications
- Error messages
- Success confirmations

### Component Architecture

**Page Components:**
- **DashboardPage**: Overview with quick access to features
- **SchemaPage**: Natural language schema generation with templates
- **VisualDesignerPage**: Interactive schema canvas with React Flow
- **VisualQueryBuilderPage**: Drag-and-drop SQL query construction
- **QueryPage**: Natural language to SQL conversion
- **CodePage**: Multi-language code generation
- **HistoryPage**: Tabbed view of all history (schemas, queries, code)
- **SettingsPage**: API keys, preferences, data management

**Feature Components:**
- **VisualSchemaDesigner**: React Flow canvas with smart layout algorithms
- **TableEditor**: Full table/column configuration with constraints
- **QueryCanvas**: Visual query builder with join visualization
- **MockDataGenerator**: Realistic test data generation
- **CommandPalette**: Keyboard navigation (Ctrl+K)
- **AIChatAssistant**: Contextual AI help
- **ConfirmModal**: Reusable confirmation dialogs (danger, warning, info, success variants)
- **SchemaChangeModal**: Schema replacement confirmation with data loss warnings

---

## Backend Architecture

### Technology Stack
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **AI Provider**: Google Generative AI
- **WebSocket**: ws library
- **Validation**: Zod/Custom validators

### Directory Structure
```
server/
├── src/
│   ├── config/              # Configuration
│   ├── controllers/         # Route handlers
│   ├── middleware/          # Express middleware
│   ├── routes/              # API routes
│   ├── services/
│   │   ├── cache/           # Response caching
│   │   ├── code/            # Code generation
│   │   ├── database/        # Database operations
│   │   ├── llm/             # AI integration
│   │   │   └── prompts/     # AI prompts
│   │   ├── orchestrator/    # Multi-step workflows
│   │   ├── query/           # Query generation
│   │   ├── schema/          # Schema generation
│   │   └── websocket/       # WebSocket handling
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
└── data/                    # SQLite database files
```

### Core Services

#### 1. Schema Generator (`schemaGenerator.ts`)
- Converts natural language to database schema
- Supports multiple database types
- Generates relationships and constraints
- Optimizes schema structure

#### 2. Query Generator (`queryGenerator.ts`)
- Natural language to SQL conversion
- CRUD operation generation
- Query analysis and optimization
- Performance scoring

#### 3. Code Generator (`codeGenerator.ts`)
- Multi-language code generation
- Framework-specific templates
- Generates:
  - Entities/Models
  - Repositories/DAOs
  - Services
  - Controllers/Routes
  - DTOs
  - Migrations
  - Configuration files

#### 4. Gemini Service (`geminiService.ts`)
- Multi-key management and rotation
- Rate limit handling
- Retry logic with exponential backoff
- Prompt optimization
- Response parsing and validation

#### 5. WebSocket Server (`WebSocketServer.ts`)
- Real-time communication
- Progress updates for long operations
- Streaming responses
- Client connection management

#### 6. History Database (`historyDatabase.ts`)
- Stores all generated artifacts
- Schema versioning
- Query history tracking
- Code generation records
- Search and filtering

---

## Data Flow

### 1. Schema Generation Flow
```
User Input (Natural Language)
    ↓
Frontend validates & sends to /api/schema/generate
    ↓
Backend Controller receives request
    ↓
Schema Service processes via Gemini AI
    ↓
Generated schema saved to database
    ↓
Response sent back to frontend
    ↓
Frontend updates UI & state
```

### 2. WebSocket Flow (Real-time Updates)
```
Frontend establishes WebSocket connection
    ↓
Sends generation request with requestId
    ↓
Backend processes in steps:
  - Step 1: Analyze description → Progress update
  - Step 2: Generate tables → Progress update
  - Step 3: Create relationships → Progress update
  - Step 4: Optimize schema → Progress update
    ↓
Each step sends progress event to frontend
    ↓
Final result sent when complete
    ↓
Frontend updates UI progressively
```

---

## Database Schema

### Tables

**schema_history**
- id (PRIMARY KEY)
- description (TEXT)
- schema_json (TEXT)
- sql (TEXT)
- database_type (TEXT)
- table_count (INTEGER)
- status (TEXT)
- created_at (TIMESTAMP)

**query_history**
- id (PRIMARY KEY)
- natural_language (TEXT)
- generated_sql (TEXT)
- database_type (TEXT)
- schema_context (TEXT)
- analysis_json (TEXT)
- status (TEXT)
- created_at (TIMESTAMP)

**code_generation_history**
- id (PRIMARY KEY)
- description (TEXT)
- language (TEXT)
- framework (TEXT)
- schema_json (TEXT)
- files_json (TEXT)
- options_json (TEXT)
- file_count (INTEGER)
- status (TEXT)
- processing_time (INTEGER)
- created_at (TIMESTAMP)

**visual_designer_schemas**
- id (PRIMARY KEY)
- name (TEXT)
- description (TEXT)
- database_type (TEXT)
- tables (TEXT - JSON)
- table_positions (TEXT - JSON)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

## Security Architecture

### 1. Input Validation
- Zod schemas for type validation
- Sanitization of user inputs
- SQL injection prevention
- XSS protection

### 2. Rate Limiting
```typescript
rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
})
```

### 3. CORS Configuration
```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
})
```

### 4. API Key Management
- Environment variable storage
- Key rotation mechanism
- Never exposed to client
- Encrypted in transit

---

## Performance Optimizations

### Frontend
1. **Code Splitting**: Dynamic imports for routes
2. **Lazy Loading**: Components loaded on demand
3. **Memoization**: React.memo, useMemo, useCallback
4. **Debouncing**: User input handling
5. **Virtual Scrolling**: Large lists in history

### Backend
1. **Response Caching**: Frequently requested data
2. **Connection Pooling**: Database connections
3. **Compression**: gzip/brotli compression
4. **Rate Limiting**: Prevent abuse
5. **Batch Processing**: Multiple operations

### Database
1. **Indexes**: On frequently queried columns
2. **Prepared Statements**: Query optimization
3. **WAL Mode**: Better concurrent access
4. **Regular Vacuum**: Database maintenance

---

## Scalability Considerations

### Current Limitations
- SQLite: Single-file database (not ideal for high concurrency)
- Single server instance
- No horizontal scaling

### Future Enhancements
1. **Database Migration**: SQLite → PostgreSQL/MySQL
2. **Load Balancing**: Multiple server instances
3. **Caching Layer**: Redis for session/response caching
4. **Message Queue**: RabbitMQ/Kafka for async tasks
5. **Microservices**: Split into focused services
6. **CDN Integration**: Static asset delivery

---

## Error Handling

### Frontend
- Try-catch blocks in async operations
- Error boundaries for component crashes
- User-friendly error messages
- Retry mechanisms for failed requests

### Backend
- Global error handler middleware
- Structured error responses
- Logging with different levels
- Graceful degradation

---

## Monitoring & Logging

### Application Logs
- Winston for structured logging
- Different log levels (debug, info, warn, error)
- Log rotation
- Centralized log aggregation (future)

### Metrics to Track
- API response times
- Error rates
- AI API usage
- Database query performance
- WebSocket connection count
- Memory usage
- CPU usage

---

## CI/CD Pipeline (Future)

```
Code Push → GitHub
    ↓
GitHub Actions triggered
    ↓
Run Tests (Unit + Integration)
    ↓
Build Docker Images
    ↓
Push to Container Registry
    ↓
Deploy to Staging
    ↓
Automated Testing
    ↓
Manual Approval
    ↓
Deploy to Production
```

---

## Technology Choices Rationale

### Why React?
- Component-based architecture
- Large ecosystem
- TypeScript support
- Excellent developer experience

### Why Express.js?
- Lightweight and flexible
- Extensive middleware ecosystem
- Easy WebSocket integration
- TypeScript compatible

### Why SQLite?
- Zero configuration
- Serverless
- Perfect for MVP
- Easy backup and migration

### Why Zustand?
- Simple API
- No boilerplate
- TypeScript first
- Small bundle size

### Why Gemini AI?
- Latest AI capabilities
- Good rate limits
- Cost-effective
- Multi-language support
