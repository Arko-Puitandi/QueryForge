// Database Types
export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'sqlserver';

// Target Programming Languages
export type TargetLanguage = 'java' | 'python' | 'nodejs' | 'csharp' | 'go';

// Framework options per language
export type JavaFramework = 'spring-boot' | 'quarkus' | 'micronaut';
export type PythonFramework = 'django' | 'fastapi' | 'flask';
export type NodeFramework = 'express-prisma' | 'nestjs-typeorm' | 'fastify-sequelize';
export type CSharpFramework = 'aspnet-efcore';
export type GoFramework = 'gin-gorm' | 'echo-gorm';

export type Framework = JavaFramework | PythonFramework | NodeFramework | CSharpFramework | GoFramework;

// Query Types
export type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'join' | 'aggregation' | 'subquery' | 'cte' | 'window';

// Column Definition
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
  autoIncrement?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  check?: string;
  comment?: string;
}

// Index Definition
export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

// Table Definition
export interface Table {
  name: string;
  columns: Column[];
  indexes?: Index[];
  primaryKey?: string[];
  comment?: string;
}

// Relationship Definition
export interface Relationship {
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

// Complete Schema Definition
export interface Schema {
  name?: string;
  tables: Table[];
  relationships?: Relationship[];
  databaseType: DatabaseType;
  createdAt?: Date;
  description?: string;
}

// Schema Generation Request
export interface SchemaRequest {
  description: string;
  databaseType: DatabaseType;
  targetLanguage?: TargetLanguage;
  framework?: Framework;
  options?: {
    includeTimestamps?: boolean;
    includeSoftDelete?: boolean;
    includeAuditFields?: boolean;
    namingConvention?: 'camelCase' | 'snake_case' | 'PascalCase';
  };
}

// Query Generation Request
export interface QueryRequest {
  naturalLanguage: string;
  schema?: Schema;
  databaseType: DatabaseType;
  queryType?: QueryType;
  options?: {
    limit?: number;
    includeExplanation?: boolean;
    optimize?: boolean;
  };
}

// Generated Query Response
export interface GeneratedQuery {
  sql: string;
  explanation: string;
  queryType: QueryType;
  tables: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  optimizations?: QueryOptimization[];
  warnings?: string[];
}

// Query Optimization
export interface QueryOptimization {
  type: 'index' | 'rewrite' | 'hint' | 'structure';
  description: string;
  originalPart?: string;
  optimizedPart?: string;
  impact: 'low' | 'medium' | 'high';
}

// Query Analysis (AI-Powered)
export interface QueryAnalysis {
  performanceScore: number; // 0-100
  readabilityScore: number; // 0-100
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'very-complex';
  estimatedExecutionTime: string;
  potentialIssues: QueryIssue[];
  suggestions: QuerySuggestion[];
  indexRecommendations: IndexRecommendation[];
  alternativeQueries: AlternativeQuery[];
}

// Query Issue
export interface QueryIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  location?: string;
  recommendation: string;
}

// Query Suggestion
export interface QuerySuggestion {
  type: 'performance' | 'readability' | 'best-practice' | 'security';
  title: string;
  description: string;
  example?: string;
  priority: 'low' | 'medium' | 'high';
}

// Index Recommendation
export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'composite';
  reason: string;
  createStatement: string;
  expectedImprovement: string;
}

// Alternative Query
export interface AlternativeQuery {
  sql: string;
  description: string;
  pros: string[];
  cons: string[];
  performanceComparison: string;
}

// Code Generation Request
export interface CodeRequest {
  schema: Schema;
  language: TargetLanguage;
  framework: Framework;
  options?: {
    includeRepository?: boolean;
    includeService?: boolean;
    includeController?: boolean;
    includeMigration?: boolean;
    includeDTO?: boolean;
    includeValidation?: boolean;
    includeComments?: boolean;
    packageName?: string;
    baseClass?: string;
  };
}

// Generated Code Response
export interface GeneratedCode {
  files: GeneratedFile[];
  language: TargetLanguage;
  framework: Framework;
  projectStructure: string;
}

// Generated File
export interface GeneratedFile {
  path: string;
  filename: string;
  content: string;
  type: 'entity' | 'repository' | 'service' | 'controller' | 'migration' | 'dto' | 'config' | 'other';
}

// Database Connection
export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl?: boolean;
  options?: Record<string, unknown>;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTime: number;
  };
}

// Validation Result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Schema Template
export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schema: Partial<Schema>;
  tags: string[];
}

// Export types
export * from './index.js';
