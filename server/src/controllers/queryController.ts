import { Request, Response, NextFunction } from 'express';
import { queryGenerator } from '../services/query/queryGenerator.js';
import { geminiService } from '../services/llm/geminiService.js';
import { historyDb } from '../services/database/historyDatabase.js';
import { QueryRequest } from '../types/index.js';
import { z } from 'zod';

// Validation schemas
const generateQuerySchema = z.object({
  naturalLanguage: z.string().min(5, 'Query description must be at least 5 characters'),
  schema: z.any(),
  databaseType: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'sqlserver']),
  queryType: z.enum(['select', 'insert', 'update', 'delete', 'join', 'aggregation', 'subquery', 'cte', 'window']).optional(),
  options: z.object({
    limit: z.number().optional(),
    includeExplanation: z.boolean().optional(),
    optimize: z.boolean().optional(),
  }).optional(),
});

const analyzeQuerySchema = z.object({
  sql: z.string().min(1, 'SQL query is required'),
  schema: z.any(),
  databaseType: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'sqlserver']),
});

const crudSchema = z.object({
  tableName: z.string(),
  schema: z.any(),
  databaseType: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'sqlserver']),
});

export const queryController = {
  /**
   * Generate SQL query from natural language
   */
  async generate(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    try {
      const validation = generateQuerySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const request: QueryRequest = validation.data;
      
      const result = await queryGenerator.generateFromNaturalLanguage(request);
      const processingTime = Date.now() - startTime;
      
      // Save to history and get the ID
      let historyId: number | undefined;
      try {
        historyId = historyDb.saveQueryHistory({
          naturalLanguage: request.naturalLanguage,
          sqlQuery: result.sql,
          databaseType: request.databaseType,
          schemaContext: request.schema ? JSON.stringify(request.schema).substring(0, 1000) : undefined,
          explanation: result.explanation,
          status: 'success',
          processingTime,
        });
        console.log('[QueryController] Saved to history with ID:', historyId);
      } catch (historyError) {
        console.error('[QueryController] Failed to save history:', historyError);
      }
      
      res.json({
        success: true,
        data: { ...result, historyId },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime,
        },
      });
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      // Save error to history
      try {
        const request = req.body;
        historyDb.saveQueryHistory({
          naturalLanguage: request?.naturalLanguage || 'Unknown',
          sqlQuery: '',
          databaseType: request?.databaseType || 'postgresql',
          status: 'error',
          errorMessage: error.message,
          processingTime,
        });
      } catch (historyError) {
        console.error('[QueryController] Failed to save error history:', historyError);
      }
      
      next(error);
    }
  },

  /**
   * Generate CRUD operations for a table
   */
  async generateCRUD(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = crudSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const { tableName, schema, databaseType } = validation.data;
      const startTime = Date.now();
      
      const crud = await queryGenerator.generateCRUD(tableName, schema, databaseType);
      
      res.json({
        success: true,
        data: crud,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * AI-powered query analysis
   */
  async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = analyzeQuerySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const { sql, schema, databaseType } = validation.data;
      const startTime = Date.now();
      
      const analysis = await queryGenerator.analyzeQuery(sql, schema, databaseType);
      
      res.json({
        success: true,
        data: analysis,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Optimize a SQL query
   */
  async optimize(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = analyzeQuerySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const { sql, schema, databaseType } = validation.data;
      const startTime = Date.now();
      
      const result = await queryGenerator.optimizeQuery(sql, schema, databaseType);
      
      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Explain a SQL query in plain English
   */
  async explain(req: Request, res: Response, next: NextFunction) {
    try {
      const { sql, databaseType } = req.body;
      
      if (!sql) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SQL',
            message: 'SQL query is required',
          },
        });
      }

      const startTime = Date.now();
      const explanation = await queryGenerator.explainQuery(sql, databaseType || 'postgresql');
      
      res.json({
        success: true,
        data: { explanation },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Validate SQL syntax
   */
  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const { sql, databaseType } = req.body;
      
      if (!sql) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SQL',
            message: 'SQL query is required',
          },
        });
      }

      const result = queryGenerator.validateSyntax(sql, databaseType || 'postgresql');
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Format SQL query
   */
  async format(req: Request, res: Response, next: NextFunction) {
    try {
      const { sql } = req.body;
      
      if (!sql) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SQL',
            message: 'SQL query is required',
          },
        });
      }

      const formatted = queryGenerator.formatQuery(sql);
      
      res.json({
        success: true,
        data: { formatted },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Suggest indexes based on queries
   */
  async suggestIndexes(req: Request, res: Response, next: NextFunction) {
    try {
      const { queries, schema, databaseType } = req.body;
      
      if (!queries || !Array.isArray(queries) || queries.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QUERIES',
            message: 'At least one query is required',
          },
        });
      }

      if (!schema) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SCHEMA',
            message: 'Schema is required',
          },
        });
      }

      const startTime = Date.now();
      const suggestions = await queryGenerator.suggestIndexes(queries, schema, databaseType || 'postgresql');
      
      res.json({
        success: true,
        data: suggestions,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Chat with AI about SQL/database questions
   */
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_MESSAGE',
            message: 'Message is required',
          },
        });
      }

      const startTime = Date.now();
      const response = await geminiService.chat(message, context);
      
      res.json({
        success: true,
        data: { response },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
