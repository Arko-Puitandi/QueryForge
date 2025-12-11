import { apiPost, apiGet, apiDelete } from './api';
import {
  Schema,
  GeneratedQuery,
  QueryAnalysis,
  GeneratedCode,
  SchemaTemplate,
  DatabaseType,
  TargetLanguage,
  QueryType,
  FrameworkOption,
} from '../types';

// ============ SCHEMA SERVICES ============
export const schemaService = {
  async generate(params: {
    description: string;
    databaseType: DatabaseType;
    targetLanguage?: TargetLanguage;
    options?: {
      includeTimestamps?: boolean;
      includeSoftDelete?: boolean;
      includeAuditFields?: boolean;
      namingConvention?: 'camelCase' | 'snake_case' | 'PascalCase';
    };
  }): Promise<{ schema: Schema; sql: string }> {
    const response = await apiPost<{ schema: Schema; sql: string }>('/schema/generate', params);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate schema');
    }
    return response.data;
  },

  async validate(schema: Schema): Promise<{
    valid: boolean;
    errors: Array<{ field: string; message: string; code: string }>;
    warnings: Array<{ field: string; message: string; suggestion?: string }>;
  }> {
    const response = await apiPost<{
      valid: boolean;
      errors: Array<{ field: string; message: string; code: string }>;
      warnings: Array<{ field: string; message: string; suggestion?: string }>;
    }>('/schema/validate', { schema });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to validate schema');
    }
    return response.data;
  },

  async convert(schema: Schema, targetDatabase: DatabaseType): Promise<{ schema: Schema; sql: string }> {
    const response = await apiPost<{ schema: Schema; sql: string }>('/schema/convert', {
      schema,
      targetDatabase,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to convert schema');
    }
    return response.data;
  },

  async format(schema: Schema, databaseType?: DatabaseType): Promise<string> {
    const response = await apiPost<{ sql: string }>('/schema/format', {
      schema,
      databaseType: databaseType || schema.databaseType,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to format schema');
    }
    return response.data.sql;
  },

  async getTemplates(): Promise<SchemaTemplate[]> {
    const response = await apiGet<SchemaTemplate[]>('/schema/templates');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch templates');
    }
    return response.data;
  },

  async getTemplate(id: string): Promise<SchemaTemplate> {
    const response = await apiGet<SchemaTemplate>(`/schema/templates/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch template');
    }
    return response.data;
  },
};

// ============ QUERY SERVICES ============
export const queryService = {
  async generate(params: {
    naturalLanguage: string;
    schema: Schema;
    databaseType: DatabaseType;
    queryType?: QueryType;
    options?: {
      limit?: number;
      includeExplanation?: boolean;
      optimize?: boolean;
    };
  }): Promise<GeneratedQuery> {
    const response = await apiPost<GeneratedQuery>('/query/generate', params);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate query');
    }
    return response.data;
  },

  async generateCRUD(tableName: string, schema: Schema, databaseType: DatabaseType): Promise<{
    create: { single: string; bulk: string };
    read: { byId: string; all: string; search: string; count: string };
    update: { full: string; partial: string };
    delete: { soft: string; hard: string };
  }> {
    const response = await apiPost<{
      create: { single: string; bulk: string };
      read: { byId: string; all: string; search: string; count: string };
      update: { full: string; partial: string };
      delete: { soft: string; hard: string };
    }>('/query/crud', { tableName, schema, databaseType });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate CRUD');
    }
    return response.data;
  },

  async analyze(sql: string, schema: Schema, databaseType: DatabaseType): Promise<QueryAnalysis> {
    const response = await apiPost<QueryAnalysis>('/query/analyze', { sql, schema, databaseType });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to analyze query');
    }
    return response.data;
  },

  async optimize(sql: string, schema: Schema, databaseType: DatabaseType): Promise<{
    optimizedSql: string;
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
    }>;
    explanation: string;
  }> {
    const response = await apiPost<{
      optimizedSql: string;
      optimizations: Array<{
        type: string;
        description: string;
        impact: string;
      }>;
      explanation: string;
    }>('/query/optimize', { sql, schema, databaseType });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to optimize query');
    }
    return response.data;
  },

  async explain(sql: string, databaseType: DatabaseType): Promise<string> {
    const response = await apiPost<{ explanation: string }>('/query/explain', { sql, databaseType });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to explain query');
    }
    return response.data.explanation;
  },

  async validate(sql: string, databaseType: DatabaseType): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const response = await apiPost<{
      valid: boolean;
      errors: string[];
      warnings: string[];
    }>('/query/validate', { sql, databaseType });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to validate query');
    }
    return response.data;
  },

  async format(sql: string): Promise<string> {
    const response = await apiPost<{ formatted: string }>('/query/format', { sql });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to format query');
    }
    return response.data.formatted;
  },

  async chat(message: string, context?: { schema?: Schema; recentQueries?: string[] }): Promise<string> {
    const response = await apiPost<{ response: string }>('/query/chat', { message, context });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get chat response');
    }
    return response.data.response;
  },
};

// ============ CODE SERVICES ============
export const codeService = {
  async generate(params: {
    schema: Schema;
    language: TargetLanguage;
    framework: string;
    options?: {
      includeRepository?: boolean;
      includeService?: boolean;
      includeController?: boolean;
      includeMigration?: boolean;
      includeDTO?: boolean;
      includeValidation?: boolean;
      includeComments?: boolean;
      packageName?: string;
    };
  }): Promise<GeneratedCode> {
    const response = await apiPost<GeneratedCode>('/code/generate', params);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate code');
    }
    return response.data;
  },

  async generatePrisma(schema: Schema): Promise<{ files: Array<{ path: string; filename: string; content: string; type: string }> }> {
    const response = await apiPost<{ files: Array<{ path: string; filename: string; content: string; type: string }> }>('/code/prisma', { schema });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate Prisma schema');
    }
    return response.data;
  },

  async generateTypeORM(schema: Schema): Promise<{ files: Array<{ path: string; filename: string; content: string; type: string }> }> {
    const response = await apiPost<{ files: Array<{ path: string; filename: string; content: string; type: string }> }>('/code/typeorm', { schema });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate TypeORM entities');
    }
    return response.data;
  },

  async getFrameworks(language?: TargetLanguage): Promise<FrameworkOption[] | Record<string, FrameworkOption[]>> {
    const url = language ? `/code/frameworks/${language}` : '/code/frameworks';
    const response = await apiGet<FrameworkOption[] | Record<string, FrameworkOption[]>>(url);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch frameworks');
    }
    return response.data;
  },
};

// ============ HISTORY SERVICES ============
export interface SchemaHistoryEntry {
  id: number;
  description: string;
  databaseType: string;
  schemaJson: string;
  sqlOutput: string;
  tableCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
  processingTime: number;
  createdAt: string;
}

export interface QueryHistoryEntry {
  id: number;
  naturalLanguage: string;
  sqlQuery: string;
  databaseType: string;
  schemaContext?: string;
  explanation?: string;
  status: 'success' | 'error';
  errorMessage?: string;
  processingTime: number;
  createdAt: string;
}

export interface CodeGenerationHistoryEntry {
  id: number;
  description: string;
  language: string;
  framework: string;
  optionsJson?: string;
  schemaJson?: string;
  filesJson: string;
  fileCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
  processingTime: number;
  createdAt: string;
}

export interface HistoryStats {
  schemaCount: number;
  queryCount: number;
  codeGenerationCount: number;
  successRate: number;
}

export const historyService = {
  // Schema History
  async getSchemaHistory(limit: number = 50, offset: number = 0): Promise<SchemaHistoryEntry[]> {
    const response = await apiGet<SchemaHistoryEntry[]>(`/history/schema?limit=${limit}&offset=${offset}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch schema history');
    }
    return response.data;
  },

  async getSchemaById(id: number): Promise<SchemaHistoryEntry> {
    const response = await apiGet<SchemaHistoryEntry>(`/history/schema/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch schema entry');
    }
    return response.data;
  },

  async deleteSchema(id: number): Promise<{ schemaDeleted: boolean; queriesDeleted: number }> {
    const response = await apiDelete<{ schemaDeleted: boolean; queriesDeleted: number }>(`/history/schema/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to delete schema');
    }
    return response.data;
  },

  async clearSchemaHistory(): Promise<void> {
    await apiDelete<void>('/history/schema');
  },

  async deleteQuery(id: number): Promise<void> {
    const response = await apiDelete<void>(`/history/query/${id}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete query');
    }
  },

  async clearQueryHistory(): Promise<void> {
    await apiDelete<void>('/history/query');
  },

  async clearAllHistory(): Promise<void> {
    await apiDelete<void>('/history/all');
  },

  // Query History
  async getQueryHistory(limit: number = 50, offset: number = 0): Promise<QueryHistoryEntry[]> {
    const response = await apiGet<QueryHistoryEntry[]>(`/history/query?limit=${limit}&offset=${offset}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch query history');
    }
    return response.data;
  },

  async getQueryById(id: number): Promise<QueryHistoryEntry> {
    const response = await apiGet<QueryHistoryEntry>(`/history/query/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch query entry');
    }
    return response.data;
  },

  // Stats
  async getStats(): Promise<HistoryStats> {
    const response = await apiGet<HistoryStats>('/history/stats');
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch history stats');
    }
    return response.data;
  },

  // Search
  async search(query: string, type: 'schema' | 'query' | 'code' | 'all' = 'all'): Promise<Array<SchemaHistoryEntry | QueryHistoryEntry | CodeGenerationHistoryEntry>> {
    const response = await apiGet<Array<SchemaHistoryEntry | QueryHistoryEntry | CodeGenerationHistoryEntry>>(
      `/history/search?q=${encodeURIComponent(query)}&type=${type}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to search history');
    }
    return response.data;
  },

  // Code Generation History
  async getCodeGenerationHistory(limit: number = 50, offset: number = 0): Promise<CodeGenerationHistoryEntry[]> {
    const response = await apiGet<CodeGenerationHistoryEntry[]>(`/history/code?limit=${limit}&offset=${offset}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch code generation history');
    }
    return response.data;
  },

  async getCodeGenerationById(id: number): Promise<CodeGenerationHistoryEntry> {
    const response = await apiGet<CodeGenerationHistoryEntry>(`/history/code/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch code generation entry');
    }
    return response.data;
  },

  async deleteCodeGeneration(id: number): Promise<void> {
    const response = await apiDelete<void>(`/history/code/${id}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete code generation');
    }
  },

  async clearCodeGenerationHistory(): Promise<void> {
    await apiDelete<void>('/history/code');
  },
};
