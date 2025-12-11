import { geminiService } from '../llm/geminiService.js';
import {
  Schema,
  QueryRequest,
  GeneratedQuery,
  QueryAnalysis,
  QueryType,
  DatabaseType,
  QueryOptimization,
} from '../../types/index.js';

export class QueryGenerator {
  /**
   * Generate SQL query from natural language
   */
  async generateFromNaturalLanguage(request: QueryRequest): Promise<GeneratedQuery> {
    return geminiService.generateQuery(request);
  }

  /**
   * Generate CRUD operations for a table
   */
  async generateCRUD(
    tableName: string,
    schema: Schema,
    databaseType: DatabaseType
  ): Promise<{
    create: { single: string; bulk: string };
    read: { byId: string; all: string; search: string; count: string };
    update: { full: string; partial: string };
    delete: { soft: string; hard: string };
  }> {
    const table = schema.tables.find(t => t.name === tableName);
    if (!table) {
      throw new Error(`Table "${tableName}" not found in schema`);
    }

    const columns = table.columns.filter(c => !c.autoIncrement);
    const columnNames = columns.map(c => c.name);
    const pkColumn = table.columns.find(c => c.primaryKey)?.name || 'id';

    const paramPlaceholder = this.getParamPlaceholder(databaseType);
    const quote = this.getQuoteChar(databaseType);

    // Generate queries based on database type
    const crud = {
      create: {
        single: this.generateInsertQuery(tableName, columnNames, databaseType),
        bulk: this.generateBulkInsertQuery(tableName, columnNames, databaseType),
      },
      read: {
        byId: `SELECT * FROM ${quote}${tableName}${quote} WHERE ${quote}${pkColumn}${quote} = ${paramPlaceholder(1)};`,
        all: this.generateSelectAllQuery(tableName, databaseType),
        search: this.generateSearchQuery(tableName, columns, databaseType),
        count: `SELECT COUNT(*) as total FROM ${quote}${tableName}${quote};`,
      },
      update: {
        full: this.generateUpdateQuery(tableName, columnNames, pkColumn, databaseType),
        partial: `-- Partial update: only include fields that need to be updated\n${this.generateUpdateQuery(tableName, columnNames.slice(0, 3), pkColumn, databaseType)}`,
      },
      delete: {
        soft: table.columns.some(c => c.name === 'deleted_at' || c.name === 'is_deleted')
          ? `UPDATE ${quote}${tableName}${quote} SET ${quote}deleted_at${quote} = CURRENT_TIMESTAMP WHERE ${quote}${pkColumn}${quote} = ${paramPlaceholder(1)};`
          : `-- No soft delete column found. Add 'deleted_at' or 'is_deleted' column for soft delete support.`,
        hard: `DELETE FROM ${quote}${tableName}${quote} WHERE ${quote}${pkColumn}${quote} = ${paramPlaceholder(1)};`,
      },
    };

    return crud;
  }

  /**
   * AI-powered query analysis
   */
  async analyzeQuery(
    sql: string,
    schema: Schema,
    databaseType: DatabaseType
  ): Promise<QueryAnalysis> {
    return geminiService.analyzeQuery(sql, schema, databaseType);
  }

  /**
   * Optimize a SQL query
   */
  async optimizeQuery(
    sql: string,
    schema: Schema,
    databaseType: DatabaseType
  ): Promise<{
    optimizedSql: string;
    optimizations: QueryOptimization[];
    explanation: string;
  }> {
    return geminiService.optimizeQuery(sql, schema, databaseType);
  }

  /**
   * Explain a query in plain English
   */
  async explainQuery(sql: string, databaseType: DatabaseType): Promise<string> {
    return geminiService.explainQuery(sql, databaseType);
  }

  /**
   * Suggest indexes based on query patterns
   */
  async suggestIndexes(
    queries: string[],
    schema: Schema,
    databaseType: DatabaseType
  ) {
    return geminiService.suggestIndexes(queries, schema, databaseType);
  }

  /**
   * Validate SQL syntax (basic validation)
   */
  validateSyntax(sql: string, databaseType: DatabaseType): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    const trimmed = sql.trim();
    
    if (!trimmed) {
      errors.push('Query is empty');
      return { valid: false, errors, warnings };
    }

    // Check for common SQL keywords
    const upperSql = trimmed.toUpperCase();
    const hasValidStart = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH', 'CREATE', 'ALTER', 'DROP']
      .some(keyword => upperSql.startsWith(keyword));
    
    if (!hasValidStart) {
      errors.push('Query must start with a valid SQL keyword (SELECT, INSERT, UPDATE, DELETE, etc.)');
    }

    // Check for unclosed quotes
    const singleQuotes = (sql.match(/'/g) || []).length;
    const doubleQuotes = (sql.match(/"/g) || []).length;
    
    if (singleQuotes % 2 !== 0) {
      errors.push('Unclosed single quote detected');
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Unclosed double quote detected');
    }

    // Check for unclosed parentheses
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      errors.push(`Mismatched parentheses: ${openParens} opening, ${closeParens} closing`);
    }

    // Warnings
    if (upperSql.includes('SELECT *')) {
      warnings.push('Using SELECT * is not recommended for production queries. Specify columns explicitly.');
    }

    if (upperSql.includes('DELETE') && !upperSql.includes('WHERE')) {
      warnings.push('DELETE without WHERE clause will delete all rows!');
    }

    if (upperSql.includes('UPDATE') && !upperSql.includes('WHERE')) {
      warnings.push('UPDATE without WHERE clause will update all rows!');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format SQL query for readability
   */
  formatQuery(sql: string): string {
    // Basic SQL formatting
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
      'INNER JOIN', 'OUTER JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY',
      'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
      'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'WITH', 'AS', 'UNION', 'EXCEPT', 'INTERSECT'
    ];

    let formatted = sql;
    
    // Add newlines before major keywords
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n${keyword}`);
    }

    // Clean up multiple newlines and leading whitespace
    formatted = formatted
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .join('\n');

    // Add indentation for subqueries
    let indentLevel = 0;
    const lines = formatted.split('\n');
    const indentedLines = lines.map(line => {
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      if (closeParens > openParens) {
        indentLevel = Math.max(0, indentLevel - (closeParens - openParens));
      }
      
      const indented = '  '.repeat(indentLevel) + line;
      
      if (openParens > closeParens) {
        indentLevel += (openParens - closeParens);
      }
      
      return indented;
    });

    return indentedLines.join('\n');
  }

  // ============ PRIVATE HELPER METHODS ============

  private getParamPlaceholder(databaseType: DatabaseType): (index: number) => string {
    switch (databaseType) {
      case 'postgresql':
        return (i) => `$${i}`;
      case 'mysql':
      case 'sqlite':
        return () => '?';
      case 'sqlserver':
        return (i) => `@p${i}`;
      default:
        return (i) => `$${i}`;
    }
  }

  private getQuoteChar(databaseType: DatabaseType): string {
    switch (databaseType) {
      case 'mysql':
        return '`';
      case 'sqlserver':
        return '';  // Use [] instead
      default:
        return '"';
    }
  }

  private generateInsertQuery(
    tableName: string,
    columns: string[],
    databaseType: DatabaseType
  ): string {
    const quote = this.getQuoteChar(databaseType);
    const param = this.getParamPlaceholder(databaseType);
    
    const columnList = columns.map(c => `${quote}${c}${quote}`).join(', ');
    const valueList = columns.map((_, i) => param(i + 1)).join(', ');

    let sql = `INSERT INTO ${quote}${tableName}${quote} (${columnList})\nVALUES (${valueList})`;
    
    if (databaseType === 'postgresql') {
      sql += '\nRETURNING *';
    }
    
    return sql + ';';
  }

  private generateBulkInsertQuery(
    tableName: string,
    columns: string[],
    databaseType: DatabaseType
  ): string {
    const quote = this.getQuoteChar(databaseType);
    const param = this.getParamPlaceholder(databaseType);
    
    const columnList = columns.map(c => `${quote}${c}${quote}`).join(', ');
    const valueList = columns.map((_, i) => param(i + 1)).join(', ');

    return `INSERT INTO ${quote}${tableName}${quote} (${columnList})\nVALUES\n  (${valueList}),\n  (${valueList}),\n  -- ... more rows\n;`;
  }

  private generateSelectAllQuery(tableName: string, databaseType: DatabaseType): string {
    const quote = this.getQuoteChar(databaseType);
    const param = this.getParamPlaceholder(databaseType);

    switch (databaseType) {
      case 'sqlserver':
        return `SELECT * FROM [${tableName}]\nORDER BY [id]\nOFFSET ${param(1)} ROWS\nFETCH NEXT ${param(2)} ROWS ONLY;`;
      default:
        return `SELECT * FROM ${quote}${tableName}${quote}\nORDER BY ${quote}id${quote}\nLIMIT ${param(1)} OFFSET ${param(2)};`;
    }
  }

  private generateSearchQuery(
    tableName: string,
    columns: Array<{ name: string; type: string }>,
    databaseType: DatabaseType
  ): string {
    const quote = this.getQuoteChar(databaseType);
    const param = this.getParamPlaceholder(databaseType);
    
    // Find searchable columns (strings)
    const searchableColumns = columns.filter(c => 
      c.type.toUpperCase().includes('VARCHAR') || 
      c.type.toUpperCase().includes('TEXT') ||
      c.type.toUpperCase().includes('CHAR')
    );

    if (searchableColumns.length === 0) {
      return `-- No searchable text columns found in table ${tableName}`;
    }

    const searchConditions = searchableColumns
      .slice(0, 3) // Limit to first 3 searchable columns
      .map(c => `${quote}${c.name}${quote} ILIKE ${param(1)}`)
      .join('\n    OR ');

    return `SELECT * FROM ${quote}${tableName}${quote}\nWHERE ${searchConditions}\nLIMIT 50;`;
  }

  private generateUpdateQuery(
    tableName: string,
    columns: string[],
    pkColumn: string,
    databaseType: DatabaseType
  ): string {
    const quote = this.getQuoteChar(databaseType);
    const param = this.getParamPlaceholder(databaseType);
    
    const setClause = columns
      .filter(c => c !== pkColumn)
      .map((c, i) => `${quote}${c}${quote} = ${param(i + 1)}`)
      .join(',\n  ');

    const lastParamIndex = columns.length;
    
    return `UPDATE ${quote}${tableName}${quote}\nSET ${setClause}\nWHERE ${quote}${pkColumn}${quote} = ${param(lastParamIndex)};`;
  }
}

export const queryGenerator = new QueryGenerator();
