# 🚀 Enterprise Text-to-SQL Platform

An AI-powered, enterprise-grade Text-to-SQL platform that transforms natural language into optimized SQL queries. Built with **Google Gemini 2.5 Flash** for intelligent query generation, performance analysis, and multi-language code generation.

![Text-to-SQL Platform](https://img.shields.io/badge/AI-Powered-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![Node.js](https://img.shields.io/badge/Node.js-20+-green)

## ✨ Features

### 🎯 Core Capabilities

- **Schema Generation**: Transform natural language descriptions into complete database schemas
- **Query Generation**: Convert plain English questions into optimized SQL queries
- **AI Query Analysis**: Get performance scores, complexity analysis, and optimization suggestions
- **Multi-Language Code Generation**: Generate models, repositories, and services for 5+ languages
- **Query History**: Track and reuse previously generated queries

### 🗄️ Supported Databases

| Database | Status |
|----------|--------|
| PostgreSQL | ✅ Full Support |
| MySQL | ✅ Full Support |
| SQLite | ✅ Full Support |
| SQL Server | ✅ Full Support |
| MongoDB | ✅ Basic Support |

### 💻 Code Generation Languages

| Language | Frameworks |
|----------|------------|
| Java | Spring Boot, Hibernate, Micronaut |
| Python | Django, FastAPI, SQLAlchemy |
| Node.js | Express, Prisma, TypeORM, Sequelize |
| C# | Entity Framework Core, Dapper |
| Go | GORM, sqlx |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Schema Page │  │ Query Page  │  │ Code Page   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                     │
│  ┌─────────────────────────────────────────────────┐          │
│  │              Zustand State Management            │          │
│  └─────────────────────────────────────────────────┘          │
│         │                │                │                     │
│  ┌─────────────────────────────────────────────────┐          │
│  │              API Services (Axios)                │          │
│  └─────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Express)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Controllers │  │  Middleware │  │   Routes    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                                                       │
│  ┌─────────────────────────────────────────────────┐          │
│  │              Core Services                       │          │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │          │
│  │  │ Schema   │ │  Query   │ │   Code   │        │          │
│  │  │Generator │ │Generator │ │Generator │        │          │
│  │  └──────────┘ └──────────┘ └──────────┘        │          │
│  └─────────────────────────────────────────────────┘          │
│         │                                                       │
│  ┌─────────────────────────────────────────────────┐          │
│  │          Gemini AI Service (LLM)                 │          │
│  └─────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Google Gemini 2.5 Flash API
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TextToSql
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # server/.env
   PORT=3001
   NODE_ENV=development
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

4. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

5. **Start the development servers**
   
   Terminal 1 (Server):
   ```bash
   cd server
   npm run dev
   ```
   
   Terminal 2 (Client):
   ```bash
   cd client
   npm run dev
   ```

6. **Open the application**
   - Client: http://localhost:5173
   - Server: http://localhost:3001

## 📖 API Documentation

### Schema Endpoints

#### Generate Schema
```http
POST /api/schema/generate
Content-Type: application/json

{
  "description": "E-commerce platform with users, products, orders",
  "databaseType": "postgresql",
  "options": {
    "includeConstraints": true,
    "includeIndexes": true
  }
}
```

#### Get Templates
```http
GET /api/schema/templates?databaseType=postgresql
```

### Query Endpoints

#### Generate Query
```http
POST /api/query/generate
Content-Type: application/json

{
  "naturalLanguage": "Get all users who ordered in the last 30 days",
  "schema": { ... },
  "databaseType": "postgresql",
  "options": {
    "includeExplanation": true,
    "optimizeQuery": true
  }
}
```

#### Analyze Query Performance
```http
POST /api/query/analyze
Content-Type: application/json

{
  "query": "SELECT * FROM users WHERE...",
  "databaseType": "postgresql"
}
```

Response includes:
- Performance score (0-100)
- Complexity level
- Potential issues
- Optimization suggestions
- Estimated execution time

#### Generate CRUD Operations
```http
POST /api/query/crud
Content-Type: application/json

{
  "tableName": "users",
  "operation": "read",
  "schema": { ... },
  "databaseType": "postgresql"
}
```

### Code Endpoints

#### Generate Code
```http
POST /api/code/generate
Content-Type: application/json

{
  "schema": { ... },
  "language": "nodejs",
  "options": {
    "includeModels": true,
    "includeRepositories": true,
    "includeServices": true,
    "framework": "prisma"
  }
}
```

#### Generate Migration Files
```http
POST /api/code/migrations
Content-Type: application/json

{
  "schema": { ... },
  "databaseType": "postgresql"
}
```

## 🎨 UI Features

### Schema Builder
- Natural language input for schema description
- Support for multiple database types
- Toggle for constraints and indexes
- Example templates for quick start
- Visual representation of generated tables

### Query Generator
- Two modes: Natural Language & CRUD Operations
- Real-time query generation
- Performance analysis with scoring
- Query optimization suggestions
- Query explanation feature
- Syntax-highlighted SQL output

### Code Generator
- Multi-language support
- Framework-specific templates
- Component selection (Models, Repositories, Services, Controllers)
- Download generated code
- Migration file generation

### Query History
- Persistent query storage
- Search and filter capabilities
- One-click query reuse
- Export functionality

## 🛠️ Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Zustand for state management
- Axios for API calls
- React Syntax Highlighter

### Backend
- Node.js with Express
- TypeScript
- Google Generative AI (Gemini)
- Rate limiting & Security middleware
- Compression & CORS

## 📁 Project Structure

```
TextToSql/
├── client/                   # React Frontend
│   ├── src/
│   │   ├── components/       # UI Components
│   │   │   ├── common/       # Reusable components
│   │   │   └── layout/       # Layout components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service layer
│   │   ├── stores/           # Zustand stores
│   │   ├── styles/           # Global styles
│   │   └── types/            # TypeScript types
│   └── package.json
│
├── server/                   # Express Backend
│   ├── src/
│   │   ├── config/           # Configuration
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Express middleware
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── llm/          # AI/LLM services
│   │   │   ├── schema/       # Schema generation
│   │   │   ├── query/        # Query generation
│   │   │   └── code/         # Code generation
│   │   └── types/            # TypeScript types
│   └── package.json
│
└── README.md
```

## 🔐 Environment Variables

### Server (.env)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Configuration
GEMINI_API_KEY=your-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

## 📦 Building for Production

```bash
# Build server
cd server
npm run build

# Build client
cd client
npm run build
```

## 🐳 Docker Deployment

### Quick Start with Docker Compose

1. **Copy environment file**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

2. **Build and run containers**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Client: http://localhost
   - API: http://localhost:3001

### Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Development with Docker

```bash
# Start with development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Individual Container Build

```bash
# Build server image
cd server
docker build -t texttosql-server .

# Build client image
cd client
docker build -t texttosql-client .

# Run server container
docker run -d -p 3001:3001 \
  -e GEMINI_API_KEY=your_key \
  --name texttosql-server \
  texttosql-server

# Run client container
docker run -d -p 80:80 \
  --name texttosql-client \
  texttosql-client
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open-source and available under the MIT License.

## 🙏 Acknowledgments

- Google Gemini AI for powerful language model capabilities
- The open-source community for the amazing tools and libraries

---

Built with ❤️ by the Text-to-SQL Team

