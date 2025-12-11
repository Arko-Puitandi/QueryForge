import { Schema, DatabaseType } from '../../../types/index.js';

export const analysisPrompts = {
  buildAnalysisPrompt(sql: string, schema: Schema, databaseType: DatabaseType): string {
    const schemaContext = this.formatSchemaForAnalysis(schema);
    
    return `You are an expert database performance analyst and SQL consultant. Analyze the following query comprehensively.

## Query to Analyze:
\`\`\`sql
${sql}
\`\`\`

## Schema Context:
${schemaContext}

## Database: ${databaseType}

## Perform a Complete Analysis:

### 1. Performance Analysis
- Estimate execution complexity
- Identify potential bottlenecks
- Check for full table scans
- Evaluate JOIN efficiency
- Assess subquery optimization opportunities

### 2. Readability Analysis
- Code formatting and structure
- Naming clarity
- Comment requirements
- Complexity for maintenance

### 3. Best Practices Check
- SQL standards compliance
- Security considerations (SQL injection potential)
- Null handling
- Data type usage

### 4. Optimization Opportunities
- Index recommendations
- Query rewrites
- Alternative approaches

## Output Format:
Return a detailed JSON analysis:
\`\`\`json
{
  "performanceScore": 85,
  "readabilityScore": 90,
  "complexityLevel": "simple|moderate|complex|very-complex",
  "estimatedExecutionTime": "< 100ms | 100ms-1s | 1s-10s | > 10s",
  "potentialIssues": [
    {
      "severity": "info|warning|error|critical",
      "type": "performance|security|best-practice|syntax",
      "message": "Description of the issue",
      "location": "WHERE clause / JOIN / etc.",
      "recommendation": "How to fix it"
    }
  ],
  "suggestions": [
    {
      "type": "performance|readability|best-practice|security",
      "title": "Suggestion title",
      "description": "Detailed description",
      "example": "Code example if applicable",
      "priority": "low|medium|high"
    }
  ],
  "indexRecommendations": [
    {
      "table": "table_name",
      "columns": ["column1", "column2"],
      "type": "btree|hash|gin|composite",
      "reason": "Why this index would help",
      "createStatement": "CREATE INDEX idx_name ON table(columns)",
      "expectedImprovement": "Description of expected improvement"
    }
  ],
  "alternativeQueries": [
    {
      "sql": "Alternative SQL query",
      "description": "What this alternative does differently",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"],
      "performanceComparison": "Better/Worse/Similar and why"
    }
  ],
  "queryBreakdown": {
    "mainOperation": "SELECT|INSERT|UPDATE|DELETE",
    "tablesAccessed": ["table1", "table2"],
    "joinsUsed": ["INNER JOIN", "LEFT JOIN"],
    "conditionsCount": 3,
    "aggregationsUsed": ["COUNT", "SUM"],
    "subqueriesCount": 0,
    "estimatedRowsScanned": "~1000 rows",
    "indexesUsable": ["idx_user_email", "pk_orders"]
  },
  "securityAnalysis": {
    "sqlInjectionRisk": "low|medium|high",
    "sensitiveDataExposure": false,
    "recommendations": ["Use parameterized queries", "etc."]
  },
  "summary": "A brief 2-3 sentence summary of the overall query quality and main recommendations"
}
\`\`\`

## Scoring Guidelines:
- Performance Score (0-100): Based on efficiency, index usage, complexity
- Readability Score (0-100): Based on formatting, naming, structure

Provide actionable, specific recommendations that can be immediately applied.`;
  },

  buildIndexSuggestionPrompt(queries: string[], schema: Schema, databaseType: DatabaseType): string {
    const schemaContext = this.formatSchemaForAnalysis(schema);
    
    return `You are a database indexing expert. Analyze these queries and suggest optimal indexes.

## Queries to Analyze:
${queries.map((q, i) => `### Query ${i + 1}:\n\`\`\`sql\n${q}\n\`\`\``).join('\n\n')}

## Current Schema:
${schemaContext}

## Database: ${databaseType}

## Analysis Requirements:
1. Identify columns used in WHERE clauses
2. Identify columns used in JOIN conditions
3. Identify columns used in ORDER BY
4. Consider column selectivity
5. Balance read vs write performance
6. Avoid over-indexing

## Output Format:
\`\`\`json
{
  "indexes": [
    {
      "table": "table_name",
      "columns": ["column1", "column2"],
      "type": "btree|hash|gin|covering",
      "reason": "Detailed explanation of why this index is recommended",
      "createStatement": "CREATE INDEX idx_name ON table(columns)",
      "queriesBenefited": [1, 3],
      "estimatedSizeImpact": "~10MB",
      "writePerformanceImpact": "minimal|moderate|significant"
    }
  ],
  "existingIndexUsage": [
    {
      "indexName": "existing_index",
      "usedByQueries": [1, 2],
      "status": "optimal|underutilized|redundant"
    }
  ],
  "overallRecommendations": "Summary of indexing strategy"
}
\`\`\`

Prioritize indexes by their impact on the provided queries.`;
  },

  buildQueryExplanationPrompt(sql: string, databaseType: DatabaseType): string {
    return `Explain this ${databaseType} SQL query in plain English for someone learning SQL.

## Query:
\`\`\`sql
${sql}
\`\`\`

## Provide:
1. **One-Line Summary**: What does this query do in one sentence?

2. **Step-by-Step Breakdown**:
   - Explain each clause (SELECT, FROM, WHERE, JOIN, etc.)
   - Explain the purpose of each condition
   - Describe any functions or operators used

3. **Data Flow Visualization**:
   - What tables are accessed?
   - How are they connected?
   - What filters are applied?
   - What's the final output?

4. **Expected Result**:
   - Describe what kind of data will be returned
   - Describe the columns in the result
   - Estimate the result set characteristics

5. **Key Concepts Used**:
   - List SQL concepts used (JOINs, aggregation, subqueries, etc.)
   - Brief explanation of each concept

Format the response in clear, readable Markdown.`;
  },

  formatSchemaForAnalysis(schema: Schema): string {
    let output = `Database Schema: ${schema.name}\n`;
    output += `Database Type: ${schema.databaseType}\n\n`;
    
    for (const table of schema.tables) {
      output += `## Table: ${table.name}\n`;
      output += `| Column | Type | Constraints |\n`;
      output += `|--------|------|-------------|\n`;
      
      for (const col of table.columns) {
        const constraints: string[] = [];
        if (col.primaryKey) constraints.push('PK');
        if (col.unique) constraints.push('UNIQUE');
        if (!col.nullable) constraints.push('NOT NULL');
        if (col.autoIncrement) constraints.push('AUTO_INC');
        if (col.references) constraints.push(`FK->${col.references.table}`);
        
        output += `| ${col.name} | ${col.type} | ${constraints.join(', ')} |\n`;
      }
      
      if (table.indexes.length > 0) {
        output += `\nIndexes:\n`;
        for (const idx of table.indexes) {
          output += `- ${idx.name}: (${idx.columns.join(', ')}) ${idx.unique ? '[UNIQUE]' : ''} [${idx.type || 'btree'}]\n`;
        }
      }
      output += '\n';
    }
    
    return output;
  },
};
