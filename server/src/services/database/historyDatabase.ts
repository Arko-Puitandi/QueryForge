import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file location - use process.cwd() for CommonJS compatibility
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'history.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface SchemaHistoryEntry {
  id?: number;
  description: string;
  databaseType: string;
  schemaJson: string;
  sqlOutput: string;
  tableCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
  processingTime: number;
  createdAt?: string;
}

export interface QueryHistoryEntry {
  id?: number;
  naturalLanguage: string;
  sqlQuery: string;
  databaseType: string;
  schemaContext?: string;
  explanation?: string;
  status: 'success' | 'error';
  errorMessage?: string;
  processingTime: number;
  createdAt?: string;
}

export interface CodeGenerationHistoryEntry {
  id?: number;
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
  createdAt?: string;
}

export interface VisualDesignerSchema {
  id?: number;
  name: string;
  description?: string;
  databaseType: string;
  tablesJson: string;
  tablePositionsJson: string;
  tableCount: number;
  relationshipCount: number;
  createdAt?: string;
  updatedAt?: string;
}

class HistoryDatabase {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
    console.log('[HistoryDB] Database initialized at:', DB_PATH);
  }

  private initialize(): void {
    // Create schema history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        database_type TEXT NOT NULL,
        schema_json TEXT NOT NULL,
        sql_output TEXT NOT NULL,
        table_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        processing_time INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create query history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        natural_language TEXT NOT NULL,
        sql_query TEXT NOT NULL,
        database_type TEXT NOT NULL,
        schema_context TEXT,
        explanation TEXT,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        processing_time INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create code generation history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_generation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        language TEXT NOT NULL,
        framework TEXT NOT NULL,
        options_json TEXT,
        schema_json TEXT,
        files_json TEXT NOT NULL,
        file_count INTEGER NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        processing_time INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create visual designer schemas table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS visual_designer_schemas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        database_type TEXT NOT NULL DEFAULT 'postgresql',
        tables_json TEXT NOT NULL,
        table_positions_json TEXT NOT NULL,
        table_count INTEGER NOT NULL DEFAULT 0,
        relationship_count INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_schema_history_created ON schema_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_query_history_created ON query_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_code_generation_created ON code_generation_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_visual_designer_schemas_name ON visual_designer_schemas(name);
      CREATE INDEX IF NOT EXISTS idx_visual_designer_schemas_created ON visual_designer_schemas(created_at DESC);
    `);
  }

  // Schema History Methods
  saveSchemaHistory(entry: SchemaHistoryEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO schema_history (description, database_type, schema_json, sql_output, table_count, status, error_message, processing_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      entry.description,
      entry.databaseType,
      entry.schemaJson,
      entry.sqlOutput,
      entry.tableCount,
      entry.status,
      entry.errorMessage || null,
      entry.processingTime
    );
    
    console.log('[HistoryDB] Saved schema history, ID:', result.lastInsertRowid);
    return result.lastInsertRowid as number;
  }

  getSchemaHistory(limit: number = 50, offset: number = 0): SchemaHistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        description,
        database_type as databaseType,
        schema_json as schemaJson,
        sql_output as sqlOutput,
        table_count as tableCount,
        status,
        error_message as errorMessage,
        processing_time as processingTime,
        created_at as createdAt
      FROM schema_history 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset) as SchemaHistoryEntry[];
  }

  getSchemaById(id: number): SchemaHistoryEntry | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        description,
        database_type as databaseType,
        schema_json as schemaJson,
        sql_output as sqlOutput,
        table_count as tableCount,
        status,
        error_message as errorMessage,
        processing_time as processingTime,
        created_at as createdAt
      FROM schema_history 
      WHERE id = ?
    `);
    
    return stmt.get(id) as SchemaHistoryEntry | null;
  }

  deleteSchemaHistory(id: number): { schemaDeleted: boolean; queriesDeleted: number } {
    // First get the schema to find related queries
    const schema = this.getSchemaById(id);
    let queriesDeleted = 0;
    
    if (schema) {
      // Delete related queries that used this schema (matching by description in schema_context)
      const deleteQueriesStmt = this.db.prepare(`
        DELETE FROM query_history 
        WHERE schema_context LIKE ?
      `);
      // Match queries that contain tables from this schema
      const result = deleteQueriesStmt.run(`%${schema.description.substring(0, 50)}%`);
      queriesDeleted = result.changes;
    }
    
    // Delete the schema
    const stmt = this.db.prepare('DELETE FROM schema_history WHERE id = ?');
    const result = stmt.run(id);
    
    console.log(`[HistoryDB] Deleted schema ${id}, ${queriesDeleted} related queries`);
    
    return { 
      schemaDeleted: result.changes > 0,
      queriesDeleted 
    };
  }

  clearSchemaHistory(): number {
    const result = this.db.exec('DELETE FROM schema_history');
    return 0; // Returns number of deleted rows
  }

  // Query History Methods
  saveQueryHistory(entry: QueryHistoryEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO query_history (natural_language, sql_query, database_type, schema_context, explanation, status, error_message, processing_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      entry.naturalLanguage,
      entry.sqlQuery,
      entry.databaseType,
      entry.schemaContext || null,
      entry.explanation || null,
      entry.status,
      entry.errorMessage || null,
      entry.processingTime
    );
    
    console.log('[HistoryDB] Saved query history, ID:', result.lastInsertRowid);
    return result.lastInsertRowid as number;
  }

  getQueryHistory(limit: number = 50, offset: number = 0): QueryHistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        natural_language as naturalLanguage,
        sql_query as sqlQuery,
        database_type as databaseType,
        schema_context as schemaContext,
        explanation,
        status,
        error_message as errorMessage,
        processing_time as processingTime,
        created_at as createdAt
      FROM query_history 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset) as QueryHistoryEntry[];
  }

  getQueryById(id: number): QueryHistoryEntry | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        natural_language as naturalLanguage,
        sql_query as sqlQuery,
        database_type as databaseType,
        schema_context as schemaContext,
        explanation,
        status,
        error_message as errorMessage,
        processing_time as processingTime,
        created_at as createdAt
      FROM query_history 
      WHERE id = ?
    `);
    
    return stmt.get(id) as QueryHistoryEntry | null;
  }

  updateQueryHistory(id: number, updates: Partial<QueryHistoryEntry>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.sqlQuery !== undefined) {
      fields.push('sql_query = ?');
      values.push(updates.sqlQuery);
    }
    if (updates.naturalLanguage !== undefined) {
      fields.push('natural_language = ?');
      values.push(updates.naturalLanguage);
    }
    if (updates.explanation !== undefined) {
      fields.push('explanation = ?');
      values.push(updates.explanation);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE query_history
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    console.log('[HistoryDB] Updated query history, ID:', id);
    return result.changes > 0;
  }

  deleteQueryHistory(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM query_history WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  clearQueryHistory(): number {
    const result = this.db.exec('DELETE FROM query_history');
    return 0;
  }

  // Code Generation History Methods
  saveCodeGenerationHistory(entry: CodeGenerationHistoryEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO code_generation_history (description, language, framework, options_json, schema_json, files_json, file_count, status, error_message, processing_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      entry.description,
      entry.language,
      entry.framework,
      entry.optionsJson || null,
      entry.schemaJson || null,
      entry.filesJson,
      entry.fileCount,
      entry.status,
      entry.errorMessage || null,
      entry.processingTime
    );
    
    console.log('[HistoryDB] Saved code generation history, ID:', result.lastInsertRowid);
    return result.lastInsertRowid as number;
  }

  getCodeGenerationHistory(limit: number = 50, offset: number = 0): CodeGenerationHistoryEntry[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        description,
        language,
        framework,
        options_json as optionsJson,
        schema_json as schemaJson,
        files_json as filesJson,
        file_count as fileCount,
        status,
        error_message as errorMessage,
        processing_time as processingTime,
        created_at as createdAt
      FROM code_generation_history 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset) as CodeGenerationHistoryEntry[];
  }

  getCodeGenerationById(id: number): CodeGenerationHistoryEntry | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        description,
        language,
        framework,
        options_json as optionsJson,
        schema_json as schemaJson,
        files_json as filesJson,
        file_count as fileCount,
        status,
        error_message as errorMessage,
        processing_time as processingTime,
        created_at as createdAt
      FROM code_generation_history 
      WHERE id = ?
    `);
    
    return stmt.get(id) as CodeGenerationHistoryEntry | null;
  }

  deleteCodeGenerationHistory(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM code_generation_history WHERE id = ?');
    const result = stmt.run(id);
    console.log(`[HistoryDB] Deleted code generation ${id}`);
    return result.changes > 0;
  }

  clearCodeGenerationHistory(): number {
    const result = this.db.exec('DELETE FROM code_generation_history');
    return 0;
  }

  // Statistics
  getStats(): { schemaCount: number; queryCount: number; codeGenerationCount: number; successRate: number } {
    const schemaCount = (this.db.prepare('SELECT COUNT(*) as count FROM schema_history').get() as any).count;
    const queryCount = (this.db.prepare('SELECT COUNT(*) as count FROM query_history').get() as any).count;
    const codeGenerationCount = (this.db.prepare('SELECT COUNT(*) as count FROM code_generation_history').get() as any).count;
    
    const totalEntries = schemaCount + queryCount + codeGenerationCount;
    const successCount = 
      ((this.db.prepare("SELECT COUNT(*) as count FROM schema_history WHERE status = 'success'").get() as any).count) +
      ((this.db.prepare("SELECT COUNT(*) as count FROM query_history WHERE status = 'success'").get() as any).count) +
      ((this.db.prepare("SELECT COUNT(*) as count FROM code_generation_history WHERE status = 'success'").get() as any).count);
    
    const successRate = totalEntries > 0 ? (successCount / totalEntries) * 100 : 100;
    
    return { schemaCount, queryCount, codeGenerationCount, successRate: Math.round(successRate * 10) / 10 };
  }

  // Search
  searchHistory(query: string, type: 'schema' | 'query' | 'code' | 'all' = 'all'): Array<SchemaHistoryEntry | QueryHistoryEntry | CodeGenerationHistoryEntry> {
    const results: Array<SchemaHistoryEntry | QueryHistoryEntry | CodeGenerationHistoryEntry> = [];
    const searchTerm = `%${query}%`;
    
    if (type === 'schema' || type === 'all') {
      const schemaStmt = this.db.prepare(`
        SELECT 
          id, description, database_type as databaseType, schema_json as schemaJson,
          sql_output as sqlOutput, table_count as tableCount, status,
          error_message as errorMessage, processing_time as processingTime,
          created_at as createdAt, 'schema' as type
        FROM schema_history 
        WHERE description LIKE ? OR sql_output LIKE ?
        ORDER BY created_at DESC
        LIMIT 20
      `);
      results.push(...(schemaStmt.all(searchTerm, searchTerm) as SchemaHistoryEntry[]));
    }
    
    if (type === 'query' || type === 'all') {
      const queryStmt = this.db.prepare(`
        SELECT 
          id, natural_language as naturalLanguage, sql_query as sqlQuery,
          database_type as databaseType, schema_context as schemaContext,
          explanation, status, error_message as errorMessage,
          processing_time as processingTime, created_at as createdAt, 'query' as type
        FROM query_history 
        WHERE natural_language LIKE ? OR sql_query LIKE ?
        ORDER BY created_at DESC
        LIMIT 20
      `);
      results.push(...(queryStmt.all(searchTerm, searchTerm) as QueryHistoryEntry[]));
    }

    if (type === 'code' || type === 'all') {
      const codeStmt = this.db.prepare(`
        SELECT 
          id, description, language, framework, options_json as optionsJson,
          schema_json as schemaJson, files_json as filesJson, file_count as fileCount,
          status, error_message as errorMessage, processing_time as processingTime,
          created_at as createdAt, 'code' as type
        FROM code_generation_history 
        WHERE description LIKE ? OR language LIKE ? OR framework LIKE ?
        ORDER BY created_at DESC
        LIMIT 20
      `);
      results.push(...(codeStmt.all(searchTerm, searchTerm, searchTerm) as CodeGenerationHistoryEntry[]));
    }
    
    return results;
  }

  // Clear all history
  clearAllHistory(): { schemasDeleted: number; queriesDeleted: number; codeGenerationsDeleted: number } {
    const schemaCount = this.db.prepare('SELECT COUNT(*) as count FROM schema_history').get() as { count: number };
    const queryCount = this.db.prepare('SELECT COUNT(*) as count FROM query_history').get() as { count: number };
    const codeCount = this.db.prepare('SELECT COUNT(*) as count FROM code_generation_history').get() as { count: number };
    
    this.db.exec('DELETE FROM schema_history');
    this.db.exec('DELETE FROM query_history');
    this.db.exec('DELETE FROM code_generation_history');
    
    console.log(`[HistoryDB] Cleared all history: ${schemaCount.count} schemas, ${queryCount.count} queries, ${codeCount.count} code generations`);
    
    return {
      schemasDeleted: schemaCount.count,
      queriesDeleted: queryCount.count,
      codeGenerationsDeleted: codeCount.count,
    };
  }

  close(): void {
    this.db.close();
  }

  // Visual Designer Schema Methods
  saveVisualDesignerSchema(schema: VisualDesignerSchema): number {
    const stmt = this.db.prepare(`
      INSERT INTO visual_designer_schemas (name, description, database_type, tables_json, table_positions_json, table_count, relationship_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      schema.name,
      schema.description || null,
      schema.databaseType,
      schema.tablesJson,
      schema.tablePositionsJson,
      schema.tableCount,
      schema.relationshipCount
    );
    
    console.log('[HistoryDB] Saved visual designer schema, ID:', result.lastInsertRowid);
    return result.lastInsertRowid as number;
  }

  updateVisualDesignerSchema(id: number, schema: Partial<VisualDesignerSchema>): boolean {
    const updates: string[] = [];
    const values: any[] = [];

    if (schema.name !== undefined) {
      updates.push('name = ?');
      values.push(schema.name);
    }
    if (schema.description !== undefined) {
      updates.push('description = ?');
      values.push(schema.description);
    }
    if (schema.databaseType !== undefined) {
      updates.push('database_type = ?');
      values.push(schema.databaseType);
    }
    if (schema.tablesJson !== undefined) {
      updates.push('tables_json = ?');
      values.push(schema.tablesJson);
    }
    if (schema.tablePositionsJson !== undefined) {
      updates.push('table_positions_json = ?');
      values.push(schema.tablePositionsJson);
    }
    if (schema.tableCount !== undefined) {
      updates.push('table_count = ?');
      values.push(schema.tableCount);
    }
    if (schema.relationshipCount !== undefined) {
      updates.push('relationship_count = ?');
      values.push(schema.relationshipCount);
    }

    if (updates.length === 0) return false;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE visual_designer_schemas
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    console.log('[HistoryDB] Updated visual designer schema, ID:', id);
    return result.changes > 0;
  }

  getVisualDesignerSchemas(limit: number = 50): VisualDesignerSchema[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        name,
        description,
        database_type as databaseType,
        tables_json as tablesJson,
        table_positions_json as tablePositionsJson,
        table_count as tableCount,
        relationship_count as relationshipCount,
        created_at as createdAt,
        updated_at as updatedAt
      FROM visual_designer_schemas
      ORDER BY updated_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as VisualDesignerSchema[];
  }

  getVisualDesignerSchemaById(id: number): VisualDesignerSchema | null {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        name,
        description,
        database_type as databaseType,
        tables_json as tablesJson,
        table_positions_json as tablePositionsJson,
        table_count as tableCount,
        relationship_count as relationshipCount,
        created_at as createdAt,
        updated_at as updatedAt
      FROM visual_designer_schemas
      WHERE id = ?
    `);

    return stmt.get(id) as VisualDesignerSchema | null;
  }

  deleteVisualDesignerSchema(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM visual_designer_schemas WHERE id = ?');
    const result = stmt.run(id);
    console.log('[HistoryDB] Deleted visual designer schema, ID:', id);
    return result.changes > 0;
  }
}

export const historyDb = new HistoryDatabase();
