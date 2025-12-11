// Database Types
export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'sqlserver';

// Target Programming Languages
export type TargetLanguage = 'java' | 'python' | 'nodejs' | 'csharp' | 'go';

// Export Visual Query types
export * from './visualQuery';

// Query Types
export type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'join' | 'aggregation' | 'subquery' | 'cte' | 'window';

// CRUD Operations
export type CRUDOperation = 'create' | 'read' | 'update' | 'delete';

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
  indexes: Index[];
  primaryKey: string[];
  comment?: string;
}

// Relationship Definition
export interface Relationship {
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

// Complete Schema Definition
export interface Schema {
  name: string;
  tables: Table[];
  relationships: Relationship[];
  databaseType: DatabaseType;
  createdAt: Date;
  description?: string;
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
  historyId?: number; // Database history entry ID
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
  performanceScore: number;
  readabilityScore: number;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'very-complex';
  estimatedExecutionTime: string;
  potentialIssues: QueryIssue[];
  suggestions: QuerySuggestion[];
  indexRecommendations: IndexRecommendation[];
  alternativeQueries: AlternativeQuery[];
  queryBreakdown?: {
    mainOperation: string;
    tablesAccessed: string[];
    joinsUsed: string[];
    conditionsCount: number;
    aggregationsUsed: string[];
    subqueriesCount: number;
    estimatedRowsScanned: string;
    indexesUsable: string[];
  };
  securityAnalysis?: {
    sqlInjectionRisk: 'low' | 'medium' | 'high';
    sensitiveDataExposure: boolean;
    recommendations: string[];
  };
  summary?: string;
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

// Generated Code Response
export interface GeneratedCode {
  files: GeneratedFile[];
  language: TargetLanguage;
  framework: string;
  projectStructure: string;
}

// Generated File
export interface GeneratedFile {
  path: string;
  filename: string;
  content: string;
  type: 'entity' | 'repository' | 'service' | 'controller' | 'migration' | 'dto' | 'config' | 'other';
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
    requestId?: string;
    processingTime: number;
  };
}

// Framework Option
export interface FrameworkOption {
  id: string;
  name: string;
  description: string;
}
