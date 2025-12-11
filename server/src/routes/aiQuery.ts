import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import { withRateLimitRetry } from '../services/llm/rateLimitRetry';

const router = Router();

// Generate query from natural language
router.post('/generate', async (req, res) => {
  try {
    const { prompt, schemaContext, currentQuery } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: { message: 'Prompt is required' },
      });
    }

    const genAI = new GoogleGenerativeAI(config.gemini.apiKeys[0]);
    const model = genAI.getGenerativeModel({ model: config.gemini.model });

    const systemPrompt = `You are an expert SQL query builder assistant. Generate a visual query configuration from natural language.

Available Schema:
${JSON.stringify(schemaContext, null, 2)}

Current Query Context:
${JSON.stringify(currentQuery, null, 2)}

User Request: ${prompt}

Generate a valid VisualQuery JSON object that includes:
- tables: array of tables to query (with id, tableName, alias, position, selectedColumns)
- joins: array of join configurations (type, leftTable, rightTable, conditions)
- selectedColumns: array of selected columns (tableId, columnName, alias, aggregateFunction)
- filters: filter group with conditions
- groupBy: array of column names
- orderBy: array of order specifications
- distinct: boolean
- limit: number
- offset: number

Return ONLY the JSON object, no explanation.`;

    const result = await withRateLimitRetry(async () => {
      return await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });
    });

    const response = result.response.text();
    
    // Extract JSON from markdown code blocks if present
    let jsonText = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const generatedQuery = JSON.parse(jsonText.trim());

    res.json({
      success: true,
      data: {
        query: generatedQuery,
        explanation: 'Query generated from natural language',
      },
    });
  } catch (error: any) {
    console.error('AI Query generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to generate query from AI',
        code: 'AI_GENERATION_ERROR',
      },
    });
  }
});

// Analyze query and provide suggestions
router.post('/analyze', async (req, res) => {
  try {
    const { query, schemaContext } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { message: 'Query is required' },
      });
    }

    const suggestions = [];

    // Analyze for missing indexes
    if (query.filters && query.filters.conditions.length > 0) {
      const filteredColumns = extractFilteredColumns(query.filters);
      filteredColumns.forEach((col: any) => {
        suggestions.push({
          id: `index-${col.table}-${col.column}`,
          type: 'index',
          title: 'Add Index for Better Performance',
          description: `Consider adding an index on ${col.table}.${col.column} to improve filter performance.`,
          impact: 'high',
          sql: `CREATE INDEX idx_${col.table}_${col.column} ON ${col.table}(${col.column});`,
        });
      });
    }

    // Check for SELECT *
    if (query.selectedColumns.length === 0) {
      suggestions.push({
        id: 'select-star',
        type: 'optimization',
        title: 'Avoid SELECT *',
        description: 'Select only the columns you need instead of using SELECT * to reduce data transfer.',
        impact: 'medium',
      });
    }

    // Check for missing JOIN conditions
    if (query.joins && query.joins.some((j: any) => !j.conditions || j.conditions.length === 0)) {
      suggestions.push({
        id: 'join-missing',
        type: 'join',
        title: 'Missing JOIN Conditions',
        description: 'Some joins are missing ON conditions. This may result in a Cartesian product.',
        impact: 'high',
      });
    }

    // Check for missing LIMIT
    if (!query.limit && query.tables.length > 0) {
      suggestions.push({
        id: 'limit-suggest',
        type: 'optimization',
        title: 'Add LIMIT Clause',
        description: 'Consider adding a LIMIT clause to prevent returning too many rows.',
        impact: 'medium',
      });
    }

    // Check for complex filters
    if (query.filters && hasNestedFilters(query.filters)) {
      suggestions.push({
        id: 'filter-complex',
        type: 'general',
        title: 'Complex Filter Structure',
        description: 'Your query has nested filter groups. Consider simplifying for better readability.',
        impact: 'low',
      });
    }

    // Check for GROUP BY with aggregates
    const hasAggregates = query.selectedColumns.some((c: any) => c.aggregateFunction);
    if (hasAggregates && (!query.groupBy || query.groupBy.length === 0)) {
      suggestions.push({
        id: 'group-by-missing',
        type: 'general',
        title: 'Missing GROUP BY',
        description: 'You are using aggregate functions without GROUP BY. Add GROUP BY for non-aggregated columns.',
        impact: 'high',
      });
    }

    // Check for too many JOINs
    if (query.joins && query.joins.filter((j: any) => j.type === 'LEFT' || j.type === 'LEFT OUTER').length > 3) {
      suggestions.push({
        id: 'too-many-left-joins',
        type: 'optimization',
        title: 'Too Many LEFT JOINs',
        description: 'Multiple LEFT JOINs can impact performance. Consider if all are necessary.',
        impact: 'medium',
      });
    }

    res.json({
      success: true,
      data: { suggestions },
    });
  } catch (error: any) {
    console.error('Query analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to analyze query',
        code: 'ANALYSIS_ERROR',
      },
    });
  }
});

// Optimize query
router.post('/optimize', async (req, res) => {
  try {
    const { query, schemaContext } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { message: 'Query is required' },
      });
    }

    const optimizedQuery = { ...query };
    const optimizations = [];

    // Add LIMIT if missing
    if (!optimizedQuery.limit) {
      optimizedQuery.limit = 100;
      optimizations.push({
        type: 'limit',
        description: 'Added LIMIT 100 to prevent excessive rows',
      });
    }

    // Remove SELECT * by selecting all available columns
    if (optimizedQuery.selectedColumns.length === 0 && optimizedQuery.tables.length > 0) {
      optimizedQuery.tables.forEach((table: any) => {
        const schemaTable = schemaContext.find((t: any) => t.name === table.tableName);
        if (schemaTable) {
          schemaTable.columns.forEach((col: any) => {
            optimizedQuery.selectedColumns.push({
              tableId: table.id,
              columnName: col.name,
            });
          });
        }
      });
      optimizations.push({
        type: 'select',
        description: 'Replaced SELECT * with explicit column selection',
      });
    }

    res.json({
      success: true,
      data: {
        optimizedQuery,
        optimizations,
      },
    });
  } catch (error: any) {
    console.error('Query optimization error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to optimize query',
        code: 'OPTIMIZATION_ERROR',
      },
    });
  }
});

// Helper functions
function extractFilteredColumns(filterGroup: any): Array<{ table: string; column: string }> {
  const columns: Array<{ table: string; column: string }> = [];
  
  function traverse(group: any) {
    if (!group.conditions) return;
    
    group.conditions.forEach((condition: any) => {
      if (condition.isGroup) {
        traverse(condition);
      } else if (condition.column) {
        const parts = condition.column.split('.');
        if (parts.length === 2) {
          columns.push({ table: parts[0], column: parts[1] });
        }
      }
    });
  }
  
  traverse(filterGroup);
  return columns;
}

function hasNestedFilters(group: any): boolean {
  if (!group.conditions) return false;
  return group.conditions.some((c: any) => c.isGroup && c.conditions && c.conditions.length > 0);
}

export default router;
