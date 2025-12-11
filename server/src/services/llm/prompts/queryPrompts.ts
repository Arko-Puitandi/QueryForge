import { QueryRequest, Schema, DatabaseType } from '../../../types/index.js';

export const queryPrompts = {
  buildQueryPrompt(request: QueryRequest): string {
    const schemaContext = request.schema ? this.formatSchemaForPrompt(request.schema) : 'No schema provided - generate query based on common table naming conventions.';
    const dbInstructions = this.getDatabaseQueryInstructions(request.databaseType);
    
    return `You are an expert SQL developer. Generate a ${request.databaseType} query based on the natural language request.

## Schema Context:
${schemaContext}

## Natural Language Request:
${request.naturalLanguage}

## Database: ${request.databaseType}
## Query Type Hint: ${request.queryType || 'auto-detect'}

## Database-Specific Guidelines:
${dbInstructions}

## Output Format:
Return a JSON object with this structure:
\`\`\`json
{
  "sql": "YOUR SQL QUERY HERE",
  "explanation": "Step-by-step explanation of what the query does",
  "queryType": "select|insert|update|delete|join|aggregation|subquery|cte|window",
  "tables": ["table1", "table2"],
  "estimatedComplexity": "simple|moderate|complex",
  "optimizations": [
    {
      "type": "index|rewrite|hint|structure",
      "description": "Description of optimization applied",
      "impact": "low|medium|high"
    }
  ],
  "warnings": ["Any warnings about the query"]
}
\`\`\`

## Important Guidelines:
1. Write syntactically correct ${request.databaseType} SQL
2. Use proper JOINs instead of subqueries where more efficient
3. Include appropriate WHERE clauses
4. Use aliases for readability
5. Consider performance - avoid SELECT *
6. Add LIMIT if fetching large datasets (unless aggregating)
7. Use parameterized query format where applicable ($1, ?, @param)

Generate the most efficient and readable query for the request.`;
  },

  buildOptimizationPrompt(sql: string, schema: Schema, databaseType: DatabaseType): string {
    const schemaContext = this.formatSchemaForPrompt(schema);
    
    return `You are a database performance expert. Analyze and optimize the following SQL query.

## Original Query:
\`\`\`sql
${sql}
\`\`\`

## Schema Context:
${schemaContext}

## Database: ${databaseType}

## Your Task:
1. Analyze the query for performance issues
2. Identify potential bottlenecks
3. Suggest and apply optimizations
4. Recommend indexes if needed

## Output Format:
\`\`\`json
{
  "optimizedSql": "OPTIMIZED SQL QUERY",
  "optimizations": [
    {
      "type": "index|rewrite|hint|structure",
      "description": "What was optimized",
      "originalPart": "Original SQL fragment",
      "optimizedPart": "Optimized SQL fragment",
      "impact": "low|medium|high"
    }
  ],
  "explanation": "Overall explanation of optimizations made",
  "indexRecommendations": [
    {
      "table": "table_name",
      "columns": ["col1", "col2"],
      "type": "btree|hash|gin",
      "createStatement": "CREATE INDEX...",
      "reason": "Why this index helps"
    }
  ],
  "performanceNotes": "Additional performance considerations"
}
\`\`\`

## Optimization Areas to Consider:
1. **Query Structure**: Rewrite subqueries as JOINs where beneficial
2. **Index Usage**: Ensure proper index utilization
3. **Selectivity**: Move highly selective conditions first
4. **Avoiding Full Scans**: Check for operations that prevent index usage
5. **N+1 Prevention**: Combine multiple queries if applicable
6. **Data Types**: Ensure proper type matching
7. **Functions in WHERE**: Avoid functions on indexed columns

Provide the optimized query with detailed explanations.`;
  },

  buildCRUDPrompt(tableName: string, schema: Schema, databaseType: DatabaseType): string {
    const tableSchema = schema.tables.find(t => t.name === tableName);
    
    return `Generate complete CRUD operations for the "${tableName}" table in ${databaseType}.

## Table Schema:
${JSON.stringify(tableSchema, null, 2)}

## Generate these operations:
1. **CREATE** - Insert single and bulk records
2. **READ** - Get by ID, get all with pagination, search/filter
3. **UPDATE** - Update by ID, partial update
4. **DELETE** - Soft delete (if applicable) and hard delete

## Output Format:
Return a JSON object with all CRUD queries:
\`\`\`json
{
  "create": {
    "single": "INSERT query for single record",
    "bulk": "INSERT query for multiple records"
  },
  "read": {
    "byId": "SELECT query by primary key",
    "all": "SELECT query with pagination",
    "search": "SELECT query with search/filter",
    "count": "COUNT query"
  },
  "update": {
    "full": "UPDATE query for all fields",
    "partial": "UPDATE query for partial fields"
  },
  "delete": {
    "soft": "UPDATE query for soft delete (if applicable)",
    "hard": "DELETE query"
  }
}
\`\`\`

Use parameterized queries appropriate for ${databaseType}.`;
  },

  buildOptimizationPrompt(sql: string, schema: Schema, databaseType: DatabaseType): string {
    const schemaContext = this.formatSchemaForPrompt(schema);
    const dbInstructions = this.getDatabaseQueryInstructions(databaseType);
    
    return `You are an expert SQL performance optimization specialist. Analyze and optimize the following ${databaseType} query.

## Schema Context:
${schemaContext}

## Current Query:
\`\`\`sql
${sql}
\`\`\`

## Database: ${databaseType}
${dbInstructions}

## Task:
1. Analyze the query for performance issues
2. Provide an optimized version
3. List all optimizations applied with their expected impact
4. Explain the overall optimization strategy

## Output Format:
Return ONLY a valid JSON object wrapped in \`\`\`json code block. Do not include any text before or after the JSON.

\`\`\`json
{
  "optimizedSql": "YOUR OPTIMIZED SQL QUERY HERE",
  "explanation": "A clear, human-readable explanation of the overall optimization strategy and why it improves performance. This should be plain text, not JSON.",
  "optimizations": [
    {
      "type": "index|join|subquery|aggregation|filtering|projection|other",
      "description": "Clear description of what was changed",
      "impact": "high|medium|low"
    }
  ]
}
\`\`\`

CRITICAL: 
- The "explanation" field must contain plain English text explaining the optimizations
- Do NOT put JSON structures inside the explanation field
- Do NOT return the response structure as text - return actual values

## Optimization Guidelines:
1. Replace SELECT * with specific columns
2. Add appropriate WHERE clauses for filtering
3. Use JOINs instead of subqueries where more efficient
4. Add indexes suggestions in the explanation
5. Optimize GROUP BY and ORDER BY clauses
6. Remove redundant operations
7. Use CTEs for complex queries to improve readability
8. Consider query execution plan

Return valid JSON only. The query should be optimized for ${databaseType}.`;
  },

  formatSchemaForPrompt(schema: Schema): string {
    let output = `Database: ${schema.name || 'database'}\n\nTables:\n`;
    
    for (const table of schema.tables || []) {
      output += `\n### ${table.name}\n`;
      output += `Columns:\n`;
      
      for (const col of table.columns || []) {
        let colDef = `  - ${col.name}: ${col.type}`;
        if (col.primaryKey) colDef += ' [PK]';
        if (col.unique) colDef += ' [UNIQUE]';
        if (!col.nullable) colDef += ' [NOT NULL]';
        if (col.references) {
          colDef += ` -> ${col.references.table}.${col.references.column}`;
        }
        output += colDef + '\n';
      }
      
      if (table.indexes && table.indexes.length > 0) {
        output += `Indexes:\n`;
        for (const idx of table.indexes) {
          output += `  - ${idx.name}: (${idx.columns.join(', ')})${idx.unique ? ' UNIQUE' : ''}\n`;
        }
      }
    }
    
    if (schema.relationships && schema.relationships.length > 0) {
      output += `\nRelationships:\n`;
      for (const rel of schema.relationships) {
        output += `  - ${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn} (${rel.type})\n`;
      }
    }
    
    return output;
  },

  getDatabaseQueryInstructions(dbType: DatabaseType): string {
    const instructions: Record<DatabaseType, string> = {
      postgresql: `
- Use $1, $2, etc. for parameters
- Use LIMIT and OFFSET for pagination
- Leverage CTEs (WITH clause) for complex queries
- Use COALESCE for null handling
- Consider using RETURNING clause for INSERT/UPDATE`,
      
      mysql: `
- Use ? for parameters
- Use LIMIT with OFFSET for pagination
- Use IFNULL or COALESCE for null handling
- Consider using INSERT ... ON DUPLICATE KEY UPDATE
- Use proper quoting with backticks for identifiers`,
      
      sqlite: `
- Use ? or ?1, ?2 for parameters
- Use LIMIT with OFFSET for pagination
- SQLite is case-insensitive for keywords
- Use IFNULL for null handling
- Consider UPSERT (INSERT OR REPLACE)`,
      
      mongodb: `
- Generate MongoDB aggregation pipeline or find() syntax
- Use $match, $project, $lookup for queries
- Consider pagination with skip() and limit()
- Use $and, $or for complex conditions
- Return as valid MongoDB query syntax`,
      
      sqlserver: `
- Use @param for parameters
- Use OFFSET/FETCH NEXT for pagination (SQL Server 2012+)
- Use ISNULL or COALESCE for null handling
- Consider using OUTPUT clause for INSERT/UPDATE
- Use TOP for limiting results`,
    };
    
    return instructions[dbType] || instructions.postgresql;
  },
};
