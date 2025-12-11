import { CodeRequest, TargetLanguage, Framework, Schema, Table } from '../../../types/index.js';

export const codePrompts = {
  buildCodePrompt(request: CodeRequest): string {
    const schemaJson = JSON.stringify(request.schema, null, 2);
    const langInstructions = this.getLanguageInstructions(request.language, request.framework);
    
    return `You are an expert software developer. Generate production-ready code based on the database schema.

## Schema:
${schemaJson}

## Target Language: ${request.language}
## Framework: ${request.framework}

## Language-Specific Guidelines:
${langInstructions}

## Generation Options:
- Include Repository: ${request.options?.includeRepository ?? true}
- Include Service: ${request.options?.includeService ?? true}
- Include Controller: ${request.options?.includeController ?? true}
- Include Migration: ${request.options?.includeMigration ?? true}
- Include DTO: ${request.options?.includeDTO ?? true}
- Include Validation: ${request.options?.includeValidation ?? true}
- Include Comments: ${request.options?.includeComments ?? true}
- Package Name: ${request.options?.packageName ?? 'com.app'}

## Output Format:
Return a JSON object with all generated files:
\`\`\`json
{
  "files": [
    {
      "path": "src/models/",
      "filename": "User.java",
      "content": "// File content here",
      "type": "entity|repository|service|controller|migration|dto|config|other"
    }
  ],
  "projectStructure": "ASCII tree of project structure"
}
\`\`\`

## Requirements:
1. Generate proper entity/model classes for all tables
2. Include proper data type mappings
3. Add relationship annotations/decorators
4. Include validation rules
5. Generate repository interface/class for data access
6. Generate service layer with business logic
7. Generate REST API controllers
8. Generate database migration files
9. Include proper error handling
10. Follow ${request.language} best practices and conventions

Generate clean, well-documented, production-ready code.`;
  },

  getLanguageInstructions(language: TargetLanguage, framework: Framework): string {
    const instructions: Record<string, string> = {
      'java-spring-boot': `
## Java + Spring Boot Guidelines:
- Use Spring Boot 3.x conventions
- Annotate entities with @Entity, @Table, @Column
- Use @Id and @GeneratedValue for primary keys
- Use @ManyToOne, @OneToMany, @ManyToMany for relationships
- Extend JpaRepository for repositories
- Use @Service for service classes
- Use @RestController and @RequestMapping for controllers
- Include @Valid for input validation
- Use Lombok annotations (@Data, @Builder, @NoArgsConstructor)
- Generate Flyway migration files (V1__initial_schema.sql)
- Include DTO classes with MapStruct mappers
- Use ResponseEntity for API responses`,

      'java-quarkus': `
## Java + Quarkus Guidelines:
- Use Panache entities (extend PanacheEntity)
- Use @Entity with Panache patterns
- Implement PanacheRepository for custom queries
- Use @Path and @GET/@POST for REST endpoints
- Include Hibernate Validator annotations
- Use Mutiny for reactive patterns if needed`,

      'python-django': `
## Python + Django Guidelines:
- Create Django model classes extending models.Model
- Use Django field types (CharField, IntegerField, ForeignKey)
- Include Meta class for table configuration
- Generate Django admin registration
- Create serializers for DRF
- Generate ViewSets for REST API
- Include Django migrations
- Use Django's built-in validation`,

      'python-fastapi': `
## Python + FastAPI + SQLAlchemy Guidelines:
- Create SQLAlchemy models with Base
- Use Pydantic schemas for validation
- Create async repository classes
- Use dependency injection patterns
- Generate FastAPI router endpoints
- Include Alembic migration files
- Use proper type hints throughout
- Include response models`,

      'python-flask': `
## Python + Flask + SQLAlchemy Guidelines:
- Use Flask-SQLAlchemy models
- Create Marshmallow schemas
- Generate Blueprint for routes
- Include Flask-Migrate files
- Use proper decorators for routes`,

      'nodejs-express-prisma': `
## Node.js + Express + Prisma Guidelines:
- Generate Prisma schema file (.prisma)
- Create TypeScript interfaces
- Generate Prisma client usage examples
- Create Express router files
- Use Zod for validation
- Include proper async/await patterns
- Generate prisma migrate files
- Use proper error handling middleware`,

      'nodejs-nestjs-typeorm': `
## Node.js + NestJS + TypeORM Guidelines:
- Create TypeORM entity classes with decorators
- Use @Entity(), @Column(), @PrimaryGeneratedColumn()
- Create NestJS modules, services, controllers
- Use class-validator for DTO validation
- Include TypeORM migrations
- Use repository pattern with @InjectRepository
- Include proper exception filters`,

      'nodejs-fastify-sequelize': `
## Node.js + Fastify + Sequelize Guidelines:
- Create Sequelize model definitions
- Use Sequelize DataTypes
- Generate Fastify route handlers
- Include Sequelize migrations
- Use proper hooks and validations`,

      'csharp-aspnet-efcore': `
## C# + ASP.NET Core + EF Core Guidelines:
- Create entity classes with data annotations
- Use DbContext for database configuration
- Generate EF Core migrations
- Create repository interfaces and implementations
- Use controller classes with [ApiController]
- Include DTOs with AutoMapper profiles
- Use FluentValidation for validation`,

      'go-gin-gorm': `
## Go + Gin + GORM Guidelines:
- Create GORM model structs with tags
- Use proper Go naming conventions
- Generate Gin handler functions
- Create repository patterns
- Include GORM migration support
- Use proper error handling
- Include validation tags`,
    };

    const key = `${language}-${framework}`;
    return instructions[key] || instructions['nodejs-express-prisma'];
  },

  buildEntityPrompt(table: Table, language: TargetLanguage, framework: Framework): string {
    return `Generate an entity/model class for this table:

## Table Definition:
${JSON.stringify(table, null, 2)}

## Target: ${language} with ${framework}

Generate a single, complete entity class with:
1. All fields properly typed
2. Primary key annotation
3. Foreign key relationships
4. Validation annotations
5. Documentation comments
6. Any necessary imports

Return only the code, no explanation.`;
  },

  buildRepositoryPrompt(table: Table, language: TargetLanguage, framework: Framework): string {
    return `Generate a repository class/interface for the ${table.name} entity:

## Entity: ${table.name}
## Primary Key: ${table.primaryKey.join(', ')}
## Target: ${language} with ${framework}

Include these methods:
1. findById
2. findAll (with pagination)
3. save (create/update)
4. delete
5. Custom queries based on common patterns

Return only the code.`;
  },

  buildServicePrompt(table: Table, language: TargetLanguage, framework: Framework): string {
    return `Generate a service class for the ${table.name} entity:

## Entity: ${table.name}
## Target: ${language} with ${framework}

Include:
1. CRUD operations
2. Business logic validation
3. Transaction handling
4. Error handling
5. Logging

Return only the code.`;
  },

  buildControllerPrompt(table: Table, language: TargetLanguage, framework: Framework): string {
    return `Generate a REST API controller for the ${table.name} entity:

## Entity: ${table.name}
## Target: ${language} with ${framework}

Include endpoints:
1. GET /api/${table.name.toLowerCase()}s - List all (paginated)
2. GET /api/${table.name.toLowerCase()}s/:id - Get by ID
3. POST /api/${table.name.toLowerCase()}s - Create
4. PUT /api/${table.name.toLowerCase()}s/:id - Update
5. DELETE /api/${table.name.toLowerCase()}s/:id - Delete

Include:
- Input validation
- Error handling
- Proper HTTP status codes
- Response formatting

Return only the code.`;
  },

  buildMigrationPrompt(schema: Schema, framework: Framework): string {
    return `Generate database migration files for this schema:

## Schema:
${JSON.stringify(schema, null, 2)}

## Framework: ${framework}
## Database: ${schema.databaseType}

Generate:
1. Initial migration to create all tables
2. Proper foreign key constraints
3. Indexes as defined in schema
4. Rollback/down migration

Return the migration file(s) content.`;
  },
};
