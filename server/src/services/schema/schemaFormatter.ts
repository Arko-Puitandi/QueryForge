import { Schema, DatabaseType, Table, Column, Index } from '../../types/index.js';

export const schemaFormatter = {
  /**
   * Format schema to SQL DDL for the specified database type
   */
  format(schema: Schema, databaseType: DatabaseType): string {
    // Ensure schema has valid tables
    if (!schema?.tables || !Array.isArray(schema.tables)) {
      console.warn('[SchemaFormatter] No tables found in schema');
      return '-- No tables to generate';
    }

    // Normalize tables to ensure required properties exist
    schema.tables = schema.tables.map(table => this.normalizeTable(table));

    switch (databaseType) {
      case 'postgresql':
        return this.formatPostgreSQL(schema);
      case 'mysql':
        return this.formatMySQL(schema);
      case 'sqlite':
        return this.formatSQLite(schema);
      case 'mongodb':
        return this.formatMongoDB(schema);
      case 'sqlserver':
        return this.formatSQLServer(schema);
      default:
        return this.formatPostgreSQL(schema);
    }
  },

  /**
   * Normalize a table to ensure all required properties exist
   */
  normalizeTable(table: Partial<Table> & { description?: string }): Table {
    const columns = Array.isArray(table.columns) ? table.columns.map(col => this.normalizeColumn(col)) : [];
    const primaryKey = table.primaryKey || columns.filter(c => c.primaryKey).map(c => c.name);
    
    return {
      name: table.name || 'unnamed_table',
      columns,
      indexes: Array.isArray(table.indexes) ? table.indexes : [],
      primaryKey,
      comment: (table as any).description || table.comment || '',
    };
  },

  /**
   * Normalize a column to ensure all required properties exist
   */
  normalizeColumn(col: Partial<Column> & { description?: string }): Column {
    return {
      name: col.name || 'unnamed_column',
      type: col.type || 'varchar',
      nullable: col.nullable ?? true,
      primaryKey: col.primaryKey ?? false,
      unique: col.unique ?? false,
      autoIncrement: col.autoIncrement ?? false,
      defaultValue: col.defaultValue,
      references: col.references,
      comment: (col as any).description || col.comment || '',
    };
  },

  formatPostgreSQL(schema: Schema): string {
    let sql = `-- PostgreSQL Schema: ${schema.name || 'generated_schema'}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;

    // Create tables
    for (const table of schema.tables) {
      sql += this.formatPostgreSQLTable(table) + '\n\n';
    }

    // Create indexes
    for (const table of schema.tables) {
      if (table.indexes && Array.isArray(table.indexes)) {
        for (const index of table.indexes) {
          if (!index.unique) { // Unique indexes created with table
            sql += `CREATE INDEX ${index.name} ON ${table.name} (${index.columns.join(', ')});\n`;
          }
        }
      }
    }

    return sql;
  },

  formatPostgreSQLTable(table: Table): string {
    if (!table.columns || table.columns.length === 0) {
      return `-- Table ${table.name} has no columns defined`;
    }

    let sql = `CREATE TABLE ${table.name} (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${this.mapTypePostgreSQL(col.type)}`;
      
      if (col.primaryKey && col.autoIncrement) {
        def = `  ${col.name} SERIAL`;
      }
      
      if (!col.nullable) def += ' NOT NULL';
      if (col.unique && !col.primaryKey) def += ' UNIQUE';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      
      return def;
    });

    sql += columnDefs.join(',\n');

    // Primary key
    const pkColumns = table.columns.filter(c => c.primaryKey).map(c => c.name);
    if (pkColumns.length > 0) {
      sql += `,\n  PRIMARY KEY (${pkColumns.join(', ')})`;
    }

    // Foreign keys
    for (const col of table.columns) {
      if (col.references) {
        sql += `,\n  FOREIGN KEY (${col.name}) REFERENCES ${col.references.table}(${col.references.column})`;
        if (col.references.onDelete) sql += ` ON DELETE ${col.references.onDelete}`;
        if (col.references.onUpdate) sql += ` ON UPDATE ${col.references.onUpdate}`;
      }
    }

    sql += '\n);';

    // Table comment
    if (table.comment) {
      sql += `\n\nCOMMENT ON TABLE ${table.name} IS '${table.comment}';`;
    }

    return sql;
  },

  mapTypePostgreSQL(type: string): string {
    const mapping: Record<string, string> = {
      'INT': 'INTEGER',
      'BIGINT': 'BIGINT',
      'SMALLINT': 'SMALLINT',
      'BOOLEAN': 'BOOLEAN',
      'TEXT': 'TEXT',
      'JSON': 'JSONB',
      'DATETIME': 'TIMESTAMP',
      'UUID': 'UUID',
    };
    const upperType = type.toUpperCase();
    return mapping[upperType] || type;
  },

  formatMySQL(schema: Schema): string {
    let sql = `-- MySQL Schema: ${schema.name || 'generated_schema'}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;

    for (const table of schema.tables) {
      sql += this.formatMySQLTable(table) + '\n\n';
    }

    return sql;
  },

  formatMySQLTable(table: Table): string {
    if (!table.columns || table.columns.length === 0) {
      return `-- Table ${table.name} has no columns defined`;
    }

    let sql = `CREATE TABLE \`${table.name}\` (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  \`${col.name}\` ${this.mapTypeMySQL(col.type)}`;
      
      if (!col.nullable) def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (col.unique && !col.primaryKey) def += ' UNIQUE';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      if (col.comment) def += ` COMMENT '${col.comment}'`;
      
      return def;
    });

    sql += columnDefs.join(',\n');

    // Primary key
    const pkColumns = table.columns.filter(c => c.primaryKey).map(c => `\`${c.name}\``);
    if (pkColumns.length > 0) {
      sql += `,\n  PRIMARY KEY (${pkColumns.join(', ')})`;
    }

    // Foreign keys
    for (const col of table.columns) {
      if (col.references) {
        sql += `,\n  FOREIGN KEY (\`${col.name}\`) REFERENCES \`${col.references.table}\`(\`${col.references.column}\`)`;
        if (col.references.onDelete) sql += ` ON DELETE ${col.references.onDelete}`;
        if (col.references.onUpdate) sql += ` ON UPDATE ${col.references.onUpdate}`;
      }
    }

    // Indexes
    if (table.indexes && Array.isArray(table.indexes)) {
      for (const index of table.indexes) {
        const indexType = index.unique ? 'UNIQUE INDEX' : 'INDEX';
        sql += `,\n  ${indexType} \`${index.name}\` (${index.columns.map(c => `\`${c}\``).join(', ')})`;
      }
    }

    sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    if (table.comment) sql += ` COMMENT='${table.comment}'`;
    sql += ';';

    return sql;
  },

  mapTypeMySQL(type: string): string {
    const mapping: Record<string, string> = {
      'SERIAL': 'BIGINT UNSIGNED',
      'BOOLEAN': 'TINYINT(1)',
      'UUID': 'CHAR(36)',
      'JSONB': 'JSON',
      'TEXT': 'TEXT',
      'TIMESTAMP': 'DATETIME',
    };
    const upperType = type.toUpperCase();
    return mapping[upperType] || type;
  },

  formatSQLite(schema: Schema): string {
    let sql = `-- SQLite Schema: ${schema.name}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;

    for (const table of schema.tables) {
      sql += this.formatSQLiteTable(table) + '\n\n';
    }

    // Create indexes separately in SQLite
    for (const table of schema.tables) {
      if (table.indexes && Array.isArray(table.indexes)) {
        for (const index of table.indexes) {
          const unique = index.unique ? 'UNIQUE ' : '';
          sql += `CREATE ${unique}INDEX IF NOT EXISTS ${index.name} ON ${table.name} (${index.columns.join(', ')});\n`;
        }
      }
    }

    return sql;
  },

  formatSQLiteTable(table: Table): string {
    let sql = `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${this.mapTypeSQLite(col.type)}`;
      
      if (col.primaryKey) {
        def += ' PRIMARY KEY';
        if (col.autoIncrement) def += ' AUTOINCREMENT';
      }
      if (!col.nullable && !col.primaryKey) def += ' NOT NULL';
      if (col.unique && !col.primaryKey) def += ' UNIQUE';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      
      return def;
    });

    sql += columnDefs.join(',\n');

    // Foreign keys
    for (const col of table.columns) {
      if (col.references) {
        sql += `,\n  FOREIGN KEY (${col.name}) REFERENCES ${col.references.table}(${col.references.column})`;
      }
    }

    sql += '\n);';

    return sql;
  },

  mapTypeSQLite(type: string): string {
    const mapping: Record<string, string> = {
      'SERIAL': 'INTEGER',
      'BIGSERIAL': 'INTEGER',
      'BIGINT': 'INTEGER',
      'INT': 'INTEGER',
      'SMALLINT': 'INTEGER',
      'VARCHAR': 'TEXT',
      'CHAR': 'TEXT',
      'BOOLEAN': 'INTEGER',
      'TIMESTAMP': 'TEXT',
      'DATETIME': 'TEXT',
      'DATE': 'TEXT',
      'TIME': 'TEXT',
      'JSON': 'TEXT',
      'JSONB': 'TEXT',
      'UUID': 'TEXT',
      'DECIMAL': 'REAL',
      'NUMERIC': 'REAL',
      'FLOAT': 'REAL',
      'DOUBLE': 'REAL',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || type;
  },

  formatSQLServer(schema: Schema): string {
    let sql = `-- SQL Server Schema: ${schema.name}\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n\n`;

    for (const table of schema.tables) {
      sql += this.formatSQLServerTable(table) + '\n\n';
    }

    return sql;
  },

  formatSQLServerTable(table: Table): string {
    let sql = `CREATE TABLE [dbo].[${table.name}] (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  [${col.name}] ${this.mapTypeSQLServer(col.type)}`;
      
      if (col.autoIncrement) def += ' IDENTITY(1,1)';
      if (!col.nullable) def += ' NOT NULL';
      if (col.unique && !col.primaryKey) def += ' UNIQUE';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      
      return def;
    });

    sql += columnDefs.join(',\n');

    // Primary key
    const pkColumns = table.columns.filter(c => c.primaryKey).map(c => `[${c.name}]`);
    if (pkColumns.length > 0) {
      sql += `,\n  CONSTRAINT [PK_${table.name}] PRIMARY KEY CLUSTERED (${pkColumns.join(', ')})`;
    }

    // Foreign keys
    for (const col of table.columns) {
      if (col.references) {
        sql += `,\n  CONSTRAINT [FK_${table.name}_${col.references.table}] FOREIGN KEY ([${col.name}]) `;
        sql += `REFERENCES [dbo].[${col.references.table}]([${col.references.column}])`;
        if (col.references.onDelete) sql += ` ON DELETE ${col.references.onDelete}`;
        if (col.references.onUpdate) sql += ` ON UPDATE ${col.references.onUpdate}`;
      }
    }

    sql += '\n);';

    // Indexes
    if (table.indexes && Array.isArray(table.indexes)) {
      for (const index of table.indexes) {
        const unique = index.unique ? 'UNIQUE ' : '';
        sql += `\n\nCREATE ${unique}INDEX [${index.name}] ON [dbo].[${table.name}] (${index.columns.map(c => `[${c}]`).join(', ')});`;
      }
    }

    return sql;
  },

  mapTypeSQLServer(type: string): string {
    const mapping: Record<string, string> = {
      'SERIAL': 'INT',
      'BIGSERIAL': 'BIGINT',
      'BOOLEAN': 'BIT',
      'TEXT': 'NVARCHAR(MAX)',
      'VARCHAR': 'NVARCHAR',
      'CHAR': 'NCHAR',
      'TIMESTAMP': 'DATETIME2',
      'JSON': 'NVARCHAR(MAX)',
      'JSONB': 'NVARCHAR(MAX)',
      'UUID': 'UNIQUEIDENTIFIER',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || type;
  },

  formatMongoDB(schema: Schema): string {
    // MongoDB uses JSON Schema for validation
    const mongoSchema: Record<string, unknown> = {
      $jsonSchema: {
        bsonType: 'object',
        required: [] as string[],
        properties: {} as Record<string, unknown>,
      },
    };

    let output = `// MongoDB Schema: ${schema.name}\n`;
    output += `// Generated: ${new Date().toISOString()}\n\n`;

    for (const table of schema.tables) {
      const collectionSchema = this.formatMongoDBCollection(table);
      output += `// Collection: ${table.name}\n`;
      output += `db.createCollection("${table.name}", {\n`;
      output += `  validator: ${JSON.stringify(collectionSchema, null, 4)}\n`;
      output += `});\n\n`;

      // Create indexes
      if (table.indexes && Array.isArray(table.indexes)) {
        for (const index of table.indexes) {
          const indexFields: Record<string, number> = {};
          index.columns.forEach(col => indexFields[col] = 1);
          output += `db.${table.name}.createIndex(${JSON.stringify(indexFields)}, { unique: ${index.unique} });\n`;
        }
      }
      output += '\n';
    }

    return output;
  },

  formatMongoDBCollection(table: Table): Record<string, unknown> {
    const required: string[] = [];
    const properties: Record<string, unknown> = {};

    for (const col of table.columns) {
      properties[col.name] = {
        bsonType: this.mapTypeMongoDBBson(col.type),
        description: col.comment || `${col.name} field`,
      };

      if (!col.nullable && !col.primaryKey) {
        required.push(col.name);
      }
    }

    return {
      $jsonSchema: {
        bsonType: 'object',
        required,
        properties,
      },
    };
  },

  mapTypeMongoDBBson(type: string): string {
    const mapping: Record<string, string> = {
      'INT': 'int',
      'INTEGER': 'int',
      'BIGINT': 'long',
      'SERIAL': 'int',
      'BIGSERIAL': 'long',
      'VARCHAR': 'string',
      'TEXT': 'string',
      'CHAR': 'string',
      'BOOLEAN': 'bool',
      'TIMESTAMP': 'date',
      'DATETIME': 'date',
      'DATE': 'date',
      'JSON': 'object',
      'JSONB': 'object',
      'UUID': 'string',
      'DECIMAL': 'decimal',
      'NUMERIC': 'decimal',
      'FLOAT': 'double',
      'DOUBLE': 'double',
      'REAL': 'double',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || 'string';
  },

  // ============ CODE FORMATTERS ============

  formatPrismaSchema(schema: Schema): string {
    let output = `// Prisma Schema\n`;
    output += `// Generated: ${new Date().toISOString()}\n\n`;
    output += `generator client {\n  provider = "prisma-client-js"\n}\n\n`;
    output += `datasource db {\n  provider = "${schema.databaseType}"\n  url      = env("DATABASE_URL")\n}\n\n`;

    for (const table of schema.tables) {
      output += `model ${this.pascalCase(table.name)} {\n`;
      
      for (const col of table.columns) {
        let line = `  ${this.camelCase(col.name)} ${this.mapTypePrisma(col.type)}`;
        
        if (col.primaryKey) line += ' @id';
        if (col.autoIncrement) line += ' @default(autoincrement())';
        if (col.unique && !col.primaryKey) line += ' @unique';
        if (col.defaultValue) line += ` @default(${col.defaultValue})`;
        if (!col.nullable) {
          // Prisma fields are required by default
        } else {
          line = line.replace(this.mapTypePrisma(col.type), this.mapTypePrisma(col.type) + '?');
        }
        
        output += line + '\n';
      }
      
      output += `\n  @@map("${table.name}")\n`;
      output += `}\n\n`;
    }

    return output;
  },

  mapTypePrisma(type: string): string {
    const mapping: Record<string, string> = {
      'INT': 'Int',
      'INTEGER': 'Int',
      'BIGINT': 'BigInt',
      'SERIAL': 'Int',
      'BIGSERIAL': 'BigInt',
      'VARCHAR': 'String',
      'TEXT': 'String',
      'CHAR': 'String',
      'BOOLEAN': 'Boolean',
      'TIMESTAMP': 'DateTime',
      'DATETIME': 'DateTime',
      'DATE': 'DateTime',
      'JSON': 'Json',
      'JSONB': 'Json',
      'UUID': 'String',
      'DECIMAL': 'Decimal',
      'FLOAT': 'Float',
      'DOUBLE': 'Float',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || 'String';
  },

  // Helper functions
  pascalCase(str: string): string {
    return str.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('');
  },

  camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  },
};
