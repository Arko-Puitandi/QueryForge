import { geminiService } from '../llm/geminiService.js';
import { schemaTemplates, schemaFormatter } from './index.js';
import {
  Schema,
  SchemaRequest,
  DatabaseType,
  Table,
  Column,
  Relationship,
  ValidationResult,
  SchemaTemplate,
} from '../../types/index.js';

export class SchemaGenerator {
  /**
   * Generate a complete database schema from natural language description
   */
  async generateFromDescription(request: SchemaRequest): Promise<Schema> {
    return geminiService.generateSchema(request);
  }

  /**
   * Parse existing SQL DDL into a Schema object
   */
  async parseExistingSchema(sql: string, databaseType: DatabaseType): Promise<Schema> {
    // Use AI to parse the SQL
    const prompt = `Parse this ${databaseType} SQL DDL and extract the schema structure:

\`\`\`sql
${sql}
\`\`\`

Return as JSON with tables, columns, relationships, and indexes.`;

    // For now, use a simple parser for common patterns
    return this.simpleParseSql(sql, databaseType);
  }

  /**
   * Convert schema from one database type to another
   */
  async convertSchema(schema: Schema, targetDb: DatabaseType): Promise<Schema> {
    const newSchema: Schema = {
      ...schema,
      databaseType: targetDb,
      tables: schema.tables.map(table => ({
        ...table,
        columns: table.columns.map(col => ({
          ...col,
          type: this.convertDataType(col.type, schema.databaseType, targetDb),
        })),
      })),
    };

    return newSchema;
  }

  /**
   * Add a new table to existing schema
   */
  async addTable(schema: Schema, tableDescription: string): Promise<Schema> {
    const result = await geminiService.generateSchema({
      description: tableDescription,
      databaseType: schema.databaseType,
    });

    return {
      ...schema,
      tables: [...schema.tables, ...result.tables],
      relationships: [...(schema.relationships || []), ...(result.relationships || [])],
    };
  }

  /**
   * Modify an existing table
   */
  async modifyTable(schema: Schema, tableName: string, modifications: string): Promise<Schema> {
    const tableIndex = schema.tables.findIndex(t => t.name === tableName);
    if (tableIndex === -1) {
      throw new Error(`Table "${tableName}" not found in schema`);
    }

    // Use AI to understand and apply modifications
    const modificationResult = await geminiService.generateSchema({
      description: `Modify table "${tableName}" with: ${modifications}. Current table: ${JSON.stringify(schema.tables[tableIndex])}`,
      databaseType: schema.databaseType,
    });

    const updatedTables = [...schema.tables];
    updatedTables[tableIndex] = modificationResult.tables[0];

    return {
      ...schema,
      tables: updatedTables,
    };
  }

  /**
   * Validate a schema for correctness
   */
  validateSchema(schema: Schema): ValidationResult {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ field: string; message: string; suggestion?: string }> = [];

    // Check for tables
    if (!schema.tables || schema.tables.length === 0) {
      errors.push({
        field: 'tables',
        message: 'Schema must have at least one table',
        code: 'NO_TABLES',
      });
    }

    // Validate each table
    for (const table of schema.tables) {
      // Check table name
      if (!table.name || table.name.trim() === '') {
        errors.push({
          field: `table`,
          message: 'Table must have a name',
          code: 'MISSING_TABLE_NAME',
        });
      }

      // Check for columns
      if (!table.columns || table.columns.length === 0) {
        errors.push({
          field: `${table.name}.columns`,
          message: `Table "${table.name}" must have at least one column`,
          code: 'NO_COLUMNS',
        });
      }

      // Check for primary key
      const hasPrimaryKey = table.columns.some(c => c.primaryKey);
      if (!hasPrimaryKey && (!table.primaryKey || table.primaryKey.length === 0)) {
        warnings.push({
          field: `${table.name}`,
          message: `Table "${table.name}" has no primary key`,
          suggestion: 'Consider adding a primary key column',
        });
      }

      // Validate columns
      for (const column of table.columns) {
        if (!column.name) {
          errors.push({
            field: `${table.name}.column`,
            message: 'Column must have a name',
            code: 'MISSING_COLUMN_NAME',
          });
        }

        if (!column.type) {
          errors.push({
            field: `${table.name}.${column.name}`,
            message: `Column "${column.name}" must have a data type`,
            code: 'MISSING_DATA_TYPE',
          });
        }

        // Check foreign key references
        if (column.references) {
          const refTable = schema.tables.find(t => t.name === column.references?.table);
          if (!refTable) {
            errors.push({
              field: `${table.name}.${column.name}`,
              message: `Foreign key references non-existent table "${column.references.table}"`,
              code: 'INVALID_FK_REFERENCE',
            });
          } else {
            const refColumn = refTable.columns.find(c => c.name === column.references?.column);
            if (!refColumn) {
              errors.push({
                field: `${table.name}.${column.name}`,
                message: `Foreign key references non-existent column "${column.references.column}" in table "${column.references.table}"`,
                code: 'INVALID_FK_COLUMN',
              });
            }
          }
        }
      }
    }

    // Validate relationships
    if (schema.relationships && Array.isArray(schema.relationships)) {
      for (const rel of schema.relationships) {
        const fromTable = schema.tables.find(t => t.name === rel.fromTable);
        const toTable = schema.tables.find(t => t.name === rel.toTable);

      if (!fromTable) {
        errors.push({
          field: `relationship.${rel.name}`,
          message: `Relationship references non-existent table "${rel.fromTable}"`,
          code: 'INVALID_RELATIONSHIP',
        });
      }

      if (!toTable) {
        errors.push({
          field: `relationship.${rel.name}`,
          message: `Relationship references non-existent table "${rel.toTable}"`,
          code: 'INVALID_RELATIONSHIP',
        });
      }
    }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get pre-built schema templates
   */
  getTemplates(): SchemaTemplate[] {
    return schemaTemplates.getAll();
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): SchemaTemplate | undefined {
    return schemaTemplates.getById(id);
  }

  /**
   * Format schema for a specific database type
   */
  formatSchema(schema: Schema, databaseType?: DatabaseType): string {
    const targetDb = databaseType || schema.databaseType;
    return schemaFormatter.format(schema, targetDb);
  }

  // ============ PRIVATE METHODS ============

  private simpleParseSql(sql: string, databaseType: DatabaseType): Schema {
    const tables: Table[] = [];
    const relationships: Relationship[] = [];

    // Simple regex-based parser for CREATE TABLE statements
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\);/gi;
    
    let match;
    while ((match = tableRegex.exec(sql)) !== null) {
      const tableName = match[1];
      const columnsStr = match[2];
      
      const columns = this.parseColumns(columnsStr, databaseType);
      const primaryKey = columns.filter(c => c.primaryKey).map(c => c.name);

      tables.push({
        name: tableName,
        columns,
        indexes: [],
        primaryKey,
      });
    }

    return {
      name: 'parsed_schema',
      tables,
      relationships,
      databaseType,
      createdAt: new Date(),
    };
  }

  private parseColumns(columnsStr: string, _databaseType: DatabaseType): Column[] {
    const columns: Column[] = [];
    const lines = columnsStr.split(',').map(l => l.trim()).filter(l => l);

    for (const line of lines) {
      // Skip constraints defined at table level
      if (line.toUpperCase().startsWith('PRIMARY KEY') ||
          line.toUpperCase().startsWith('FOREIGN KEY') ||
          line.toUpperCase().startsWith('CONSTRAINT') ||
          line.toUpperCase().startsWith('INDEX') ||
          line.toUpperCase().startsWith('UNIQUE')) {
        continue;
      }

      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0].replace(/[`"']/g, '');
        const type = parts[1];
        
        columns.push({
          name,
          type,
          nullable: !line.toUpperCase().includes('NOT NULL'),
          primaryKey: line.toUpperCase().includes('PRIMARY KEY'),
          unique: line.toUpperCase().includes('UNIQUE'),
          autoIncrement: line.toUpperCase().includes('AUTO_INCREMENT') ||
                        line.toUpperCase().includes('SERIAL') ||
                        line.toUpperCase().includes('IDENTITY'),
        });
      }
    }

    return columns;
  }

  private convertDataType(type: string, fromDb: DatabaseType, toDb: DatabaseType): string {
    const typeMap: Record<string, Record<DatabaseType, string>> = {
      // Integer types
      'INT': { postgresql: 'INTEGER', mysql: 'INT', sqlite: 'INTEGER', mongodb: 'Number', sqlserver: 'INT' },
      'INTEGER': { postgresql: 'INTEGER', mysql: 'INT', sqlite: 'INTEGER', mongodb: 'Number', sqlserver: 'INT' },
      'BIGINT': { postgresql: 'BIGINT', mysql: 'BIGINT', sqlite: 'INTEGER', mongodb: 'Number', sqlserver: 'BIGINT' },
      'SERIAL': { postgresql: 'SERIAL', mysql: 'INT AUTO_INCREMENT', sqlite: 'INTEGER', mongodb: 'Number', sqlserver: 'INT IDENTITY' },
      
      // String types
      'VARCHAR': { postgresql: 'VARCHAR', mysql: 'VARCHAR', sqlite: 'TEXT', mongodb: 'String', sqlserver: 'NVARCHAR' },
      'TEXT': { postgresql: 'TEXT', mysql: 'TEXT', sqlite: 'TEXT', mongodb: 'String', sqlserver: 'NVARCHAR(MAX)' },
      'CHAR': { postgresql: 'CHAR', mysql: 'CHAR', sqlite: 'TEXT', mongodb: 'String', sqlserver: 'NCHAR' },
      
      // Date/Time types
      'TIMESTAMP': { postgresql: 'TIMESTAMP', mysql: 'DATETIME', sqlite: 'TEXT', mongodb: 'Date', sqlserver: 'DATETIME2' },
      'DATE': { postgresql: 'DATE', mysql: 'DATE', sqlite: 'TEXT', mongodb: 'Date', sqlserver: 'DATE' },
      'TIME': { postgresql: 'TIME', mysql: 'TIME', sqlite: 'TEXT', mongodb: 'String', sqlserver: 'TIME' },
      
      // Boolean
      'BOOLEAN': { postgresql: 'BOOLEAN', mysql: 'TINYINT(1)', sqlite: 'INTEGER', mongodb: 'Boolean', sqlserver: 'BIT' },
      
      // JSON
      'JSON': { postgresql: 'JSONB', mysql: 'JSON', sqlite: 'TEXT', mongodb: 'Object', sqlserver: 'NVARCHAR(MAX)' },
      'JSONB': { postgresql: 'JSONB', mysql: 'JSON', sqlite: 'TEXT', mongodb: 'Object', sqlserver: 'NVARCHAR(MAX)' },
      
      // UUID
      'UUID': { postgresql: 'UUID', mysql: 'CHAR(36)', sqlite: 'TEXT', mongodb: 'String', sqlserver: 'UNIQUEIDENTIFIER' },
      
      // Decimal
      'DECIMAL': { postgresql: 'DECIMAL', mysql: 'DECIMAL', sqlite: 'REAL', mongodb: 'Number', sqlserver: 'DECIMAL' },
      'NUMERIC': { postgresql: 'NUMERIC', mysql: 'DECIMAL', sqlite: 'REAL', mongodb: 'Number', sqlserver: 'NUMERIC' },
      'FLOAT': { postgresql: 'REAL', mysql: 'FLOAT', sqlite: 'REAL', mongodb: 'Number', sqlserver: 'FLOAT' },
      'DOUBLE': { postgresql: 'DOUBLE PRECISION', mysql: 'DOUBLE', sqlite: 'REAL', mongodb: 'Number', sqlserver: 'FLOAT' },
    };

    const upperType = type.toUpperCase().split('(')[0];
    const suffix = type.includes('(') ? type.substring(type.indexOf('(')) : '';

    if (typeMap[upperType] && typeMap[upperType][toDb]) {
      const mapped = typeMap[upperType][toDb];
      // Preserve length/precision for types that need it
      if (mapped.includes('VARCHAR') || mapped.includes('CHAR') || mapped.includes('DECIMAL') || mapped.includes('NUMERIC')) {
        return mapped + suffix;
      }
      return mapped;
    }

    return type; // Return original if no mapping found
  }

  /**
   * Optimize uploaded schema with AI recommendations
   */
  async optimizeSchema(schema: Schema): Promise<{ schema: Schema; suggestions: string[]; improvements: string[] }> {
    console.log('[SchemaGenerator] Optimizing schema:', schema.name);

    const suggestions: string[] = [];
    const improvements: string[] = [];
    const optimizedSchema: Schema = JSON.parse(JSON.stringify(schema)); // Deep clone

    // Analyze and optimize each table
    for (const table of optimizedSchema.tables) {
      // Add missing primary keys
      const hasPrimaryKey = table.columns.some(col => col.primaryKey);
      if (!hasPrimaryKey) {
        table.columns.unshift({
          name: 'id',
          type: schema.databaseType === 'postgresql' ? 'BIGSERIAL' : 'BIGINT',
          nullable: false,
          primaryKey: true,
          unique: true,
          autoIncrement: true,
        });
        suggestions.push(`Added primary key 'id' to table '${table.name}'`);
        improvements.push(`Primary key ensures unique row identification`);
      }

      // Add timestamps if missing
      const hasCreatedAt = table.columns.some(col => col.name.toLowerCase().includes('created'));
      const hasUpdatedAt = table.columns.some(col => col.name.toLowerCase().includes('updated'));
      
      if (!hasCreatedAt) {
        table.columns.push({
          name: 'created_at',
          type: 'TIMESTAMP',
          nullable: false,
          primaryKey: false,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
        });
        suggestions.push(`Added 'created_at' timestamp to '${table.name}'`);
        improvements.push(`Timestamps enable audit trails and data tracking`);
      }

      if (!hasUpdatedAt) {
        table.columns.push({
          name: 'updated_at',
          type: 'TIMESTAMP',
          nullable: false,
          primaryKey: false,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
        });
        suggestions.push(`Added 'updated_at' timestamp to '${table.name}'`);
      }

      // Add indexes on foreign keys
      const foreignKeys = table.columns.filter(col => col.references);
      for (const fk of foreignKeys) {
        const hasIndex = table.indexes?.some(idx => idx.columns.includes(fk.name));
        if (!hasIndex) {
          if (!table.indexes) table.indexes = [];
          table.indexes.push({
            name: `idx_${table.name}_${fk.name}`,
            columns: [fk.name],
            unique: false,
          });
          suggestions.push(`Added index on foreign key '${fk.name}' in '${table.name}'`);
          improvements.push(`Indexes on foreign keys improve JOIN query performance`);
        }
      }

      // Fix VARCHAR without length
      for (const col of table.columns) {
        if (col.type.toUpperCase().includes('VARCHAR') && !col.type.includes('(')) {
          col.type = 'VARCHAR(255)';
          suggestions.push(`Set default length for VARCHAR column '${col.name}' in '${table.name}'`);
        }
      }

      // Add indexes on searchable columns
      const searchableCols = table.columns.filter(col => 
        (col.type.toUpperCase().includes('VARCHAR') || col.type.toUpperCase().includes('TEXT')) &&
        (col.name.toLowerCase().includes('name') || col.name.toLowerCase().includes('title') || 
         col.name.toLowerCase().includes('email') || col.name.toLowerCase().includes('username'))
      );

      for (const col of searchableCols) {
        const hasIndex = table.indexes?.some(idx => idx.columns.includes(col.name));
        if (!hasIndex && col.name.toLowerCase() !== 'description') {
          if (!table.indexes) table.indexes = [];
          table.indexes.push({
            name: `idx_${table.name}_${col.name}`,
            columns: [col.name],
            unique: col.name.toLowerCase() === 'email' || col.name.toLowerCase() === 'username',
          });
          suggestions.push(`Added index on searchable column '${col.name}' in '${table.name}'`);
          improvements.push(`Indexes on frequently searched columns improve query speed`);
        }
      }
    }

    // Use AI for additional advanced optimizations
    try {
      const prompt = `Analyze this database schema and provide optimization recommendations:

Schema: ${JSON.stringify(optimizedSchema, null, 2)}

Provide recommendations for:
1. Missing relationships that should be added
2. Denormalization opportunities for performance
3. Potential data integrity issues
4. Suggested composite indexes
5. Column type optimizations

Return as JSON: { recommendations: string[], criticalIssues: string[] }`;

      const aiResponse = await geminiService.generate(prompt);
      const aiSuggestions = JSON.parse(aiResponse.match(/\{[\s\S]*\}/)?.[0] || '{"recommendations":[],"criticalIssues":[]}');
      
      if (aiSuggestions.recommendations) {
        suggestions.push(...aiSuggestions.recommendations);
      }
      if (aiSuggestions.criticalIssues) {
        improvements.push(...aiSuggestions.criticalIssues);
      }
    } catch (aiError) {
      console.warn('[SchemaGenerator] AI optimization failed, using basic optimizations only:', aiError);
    }

    console.log('[SchemaGenerator] Optimization complete. Applied', suggestions.length, 'changes');

    return {
      schema: optimizedSchema,
      suggestions,
      improvements,
    };
  }
}

export const schemaGenerator = new SchemaGenerator();
