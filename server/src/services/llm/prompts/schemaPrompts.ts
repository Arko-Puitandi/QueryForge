import { SchemaRequest, DatabaseType } from '../../../types/index.js';

export const schemaPrompts = {
  /**
   * Build prompt to get table list first (Step 1)
   */
  buildTableListPrompt(request: SchemaRequest): string {
    return `You are an expert database architect designing a ${request.databaseType} database.

TASK: List ALL tables needed for this system:
"${request.description}"

For a comprehensive system, you typically need 10-20 tables including:
- Main entity tables (e.g., users, products, orders)
- Reference/lookup tables (e.g., status_types, categories)
- Junction tables for many-to-many relationships
- Supporting tables (e.g., addresses, contacts)

Return ONLY this JSON (no other text):
\`\`\`json
{
  "schemaName": "name_of_schema",
  "tables": [
    {"name": "table1", "purpose": "stores X data"},
    {"name": "table2", "purpose": "stores Y data"}
  ]
}
\`\`\`

List at least 8-15 tables for a complete system. Use snake_case for names.`;
  },

  /**
   * Build prompt to get detailed table definitions (Step 2)
   */
  buildTableDetailsPrompt(
    request: SchemaRequest,
    tableNames: string[],
    allTableNames: string[]
  ): string {
    const dbSpecificInstructions = this.getDatabaseSpecificInstructions(request.databaseType);
    
    return `Create ${request.databaseType} table definitions for: ${tableNames.join(', ')}

Context: Building a database for "${request.description}"
All tables in schema: ${allTableNames.join(', ')}

${dbSpecificInstructions}

Return ONLY this exact JSON structure:
\`\`\`json
{
  "tables": [
    {
      "name": "table_name_here",
      "comment": "What this table stores",
      "columns": [
        {"name": "id", "type": "SERIAL", "nullable": false, "primaryKey": true, "autoIncrement": true},
        {"name": "name", "type": "VARCHAR(255)", "nullable": false, "primaryKey": false},
        {"name": "created_at", "type": "TIMESTAMP", "nullable": false, "primaryKey": false, "defaultValue": "CURRENT_TIMESTAMP"}
      ],
      "indexes": [],
      "primaryKey": ["id"]
    }
  ]
}
\`\`\`

CRITICAL RULES:
1. Each table MUST have a "columns" array with column objects inside it
2. Each column MUST have: name, type, nullable, primaryKey fields
3. Return exactly ${tableNames.length} table definitions for: ${tableNames.join(', ')}
4. Include foreign keys with "references": {"table": "x", "column": "y"}
5. Add created_at/updated_at TIMESTAMP columns to each table
6. DO NOT return column names as table names - tables contain columns`;
  },

  buildSchemaPrompt(request: SchemaRequest): string {
    const dbSpecificInstructions = this.getDatabaseSpecificInstructions(request.databaseType);
    
    return `You are an expert database architect. Create a complete database schema based on the following description.

## Requirements:
${request.description}

## Target Database: ${request.databaseType}

## Database-Specific Guidelines:
${dbSpecificInstructions}

## Options:
- Include timestamps: ${request.options?.includeTimestamps ?? true}
- Include soft delete: ${request.options?.includeSoftDelete ?? false}
- Include audit fields: ${request.options?.includeAuditFields ?? false}
- Naming convention: ${request.options?.namingConvention ?? 'snake_case'}

## Output Format:
Return a JSON object with this exact structure:
\`\`\`json
{
  "name": "schema_name",
  "description": "Brief description of the schema",
  "tables": [
    {
      "name": "table_name",
      "comment": "Table description",
      "columns": [
        {
          "name": "column_name",
          "type": "DATA_TYPE",
          "nullable": false,
          "primaryKey": true,
          "unique": false,
          "autoIncrement": true,
          "defaultValue": null,
          "references": {
            "table": "referenced_table",
            "column": "referenced_column",
            "onDelete": "CASCADE",
            "onUpdate": "CASCADE"
          },
          "comment": "Column description"
        }
      ],
      "indexes": [
        {
          "name": "idx_name",
          "columns": ["column1", "column2"],
          "unique": false,
          "type": "btree"
        }
      ],
      "primaryKey": ["id"]
    }
  ],
  "relationships": [
    {
      "name": "rel_name",
      "fromTable": "table1",
      "fromColumn": "column1",
      "toTable": "table2",
      "toColumn": "column2",
      "type": "one-to-many"
    }
  ]
}
\`\`\`

## Important Guidelines:
1. Use appropriate data types for ${request.databaseType}
2. Create proper primary keys (prefer auto-increment/serial IDs)
3. Define foreign key relationships
4. Add useful indexes for common query patterns
5. Include all necessary constraints
6. Make the schema normalized (at least 3NF)
7. Include commonly needed fields like created_at, updated_at if timestamps enabled
8. Add meaningful comments for documentation

CRITICAL: Your response MUST contain ONLY a valid JSON object wrapped in \`\`\`json code blocks. Do not include any explanatory text before or after the JSON. Do not include markdown formatting outside the JSON block.

Generate a comprehensive, production-ready schema.`;
  },

  getDatabaseSpecificInstructions(dbType: DatabaseType): string {
    const instructions: Record<DatabaseType, string> = {
      postgresql: `Use PostgreSQL types: SERIAL, BIGSERIAL, UUID, JSONB, TEXT, TIMESTAMP WITH TIME ZONE, VARCHAR(n)`,
      mysql: `Use MySQL types: AUTO_INCREMENT, BIGINT UNSIGNED, JSON, DATETIME, VARCHAR(n)`,
      sqlite: `Use SQLite types: INTEGER PRIMARY KEY, TEXT, REAL, BLOB`,
      mongodb: `Design for document storage with ObjectId for _id fields`,
      sqlserver: `Use SQL Server types: IDENTITY, NVARCHAR, DATETIME2, UNIQUEIDENTIFIER`,
    };
    
    return instructions[dbType] || instructions.postgresql;
  },

  buildModifySchemaPrompt(
    currentSchema: string,
    modifications: string,
    databaseType: DatabaseType
  ): string {
    return `You are an expert database architect. Modify the following schema based on the requested changes.

## Current Schema:
${currentSchema}

## Requested Modifications:
${modifications}

## Target Database: ${databaseType}

## Instructions:
1. Apply the requested modifications
2. Maintain referential integrity
3. Add any necessary indexes
4. Update relationships if needed
5. Keep existing data types unless change is required

Return the complete modified schema in the same JSON format.`;
  },
};
