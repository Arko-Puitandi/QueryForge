import { Request, Response, NextFunction } from 'express';
import { schemaGenerator } from '../services/schema/schemaGenerator.js';
import { schemaFormatter } from '../services/schema/schemaFormatter.js';
import { historyDb } from '../services/database/historyDatabase.js';
import { SchemaRequest, DatabaseType } from '../types/index.js';
import { z } from 'zod';

// Framework enum values
const frameworkValues = [
  'spring-boot', 'quarkus', 'micronaut',
  'django', 'fastapi', 'flask',
  'express-prisma', 'nestjs-typeorm', 'fastify-sequelize',
  'aspnet-efcore',
  'gin-gorm', 'echo-gorm'
] as const;

// Validation schemas
const generateSchemaSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters'),
  databaseType: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'sqlserver']),
  targetLanguage: z.enum(['java', 'python', 'nodejs', 'csharp', 'go']).optional(),
  framework: z.enum(frameworkValues).optional(),
  options: z.object({
    includeTimestamps: z.boolean().optional(),
    includeSoftDelete: z.boolean().optional(),
    includeAuditFields: z.boolean().optional(),
    namingConvention: z.enum(['camelCase', 'snake_case', 'PascalCase']).optional(),
  }).optional(),
});

const convertSchemaSchema = z.object({
  schema: z.any(),
  targetDatabase: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'sqlserver']),
});

export const schemaController = {
  /**
   * Generate schema from natural language description
   */
  async generate(req: Request, res: Response, next: NextFunction) {
    console.log('[SchemaController] Starting schema generation...');
    const startTime = Date.now();
    
    try {
      const validation = generateSchemaSchema.safeParse(req.body);
      if (!validation.success) {
        console.log('[SchemaController] Validation failed:', validation.error.errors);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const request: SchemaRequest = validation.data;
      
      console.log('[SchemaController] Generating schema for:', request.description.substring(0, 100) + '...');
      const schema = await schemaGenerator.generateFromDescription(request);
      console.log('[SchemaController] Schema generated with', schema.tables?.length || 0, 'tables');
      
      // Also generate SQL DDL
      console.log('[SchemaController] Formatting SQL...');
      const sql = schemaFormatter.format(schema, request.databaseType);
      console.log('[SchemaController] SQL formatted, length:', sql.length);
      
      const processingTime = Date.now() - startTime;
      
      // Save to history
      try {
        historyDb.saveSchemaHistory({
          description: request.description,
          databaseType: request.databaseType,
          schemaJson: JSON.stringify(schema),
          sqlOutput: sql,
          tableCount: schema.tables?.length || 0,
          status: 'success',
          processingTime,
        });
        console.log('[SchemaController] Saved to history');
      } catch (historyError) {
        console.error('[SchemaController] Failed to save history:', historyError);
        // Don't fail the request if history save fails
      }
      
      const response = {
        success: true,
        data: {
          schema,
          sql,
          databaseType: request.databaseType,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime,
        },
      };
      
      console.log('[SchemaController] Sending response...');
      res.json(response);
      console.log('[SchemaController] Response sent successfully');
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      // Save error to history
      try {
        const request = req.body;
        historyDb.saveSchemaHistory({
          description: request?.description || 'Unknown',
          databaseType: request?.databaseType || 'postgresql',
          schemaJson: '{}',
          sqlOutput: '',
          tableCount: 0,
          status: 'error',
          errorMessage: error.message,
          processingTime,
        });
      } catch (historyError) {
        console.error('[SchemaController] Failed to save error history:', historyError);
      }
      
      console.error('[SchemaController] Error:', error.message);
      console.error('[SchemaController] Stack:', error.stack);
      next(error);
    }
  },

  /**
   * Validate a schema
   */
  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const { schema } = req.body;
      
      if (!schema) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SCHEMA',
            message: 'Schema is required',
          },
        });
      }

      const validationResult = schemaGenerator.validateSchema(schema);
      
      res.json({
        success: true,
        data: validationResult,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Convert schema to different database type
   */
  async convert(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = convertSchemaSchema.safeParse(req.body);
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

      const { schema, targetDatabase } = validation.data;
      const startTime = Date.now();
      
      const convertedSchema = await schemaGenerator.convertSchema(schema, targetDatabase);
      const sql = schemaFormatter.format(convertedSchema, targetDatabase);
      
      res.json({
        success: true,
        data: {
          schema: convertedSchema,
          sql,
          targetDatabase,
        },
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
   * Format schema as SQL DDL
   */
  async format(req: Request, res: Response, next: NextFunction) {
    try {
      const { schema, databaseType } = req.body;
      
      if (!schema) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SCHEMA',
            message: 'Schema is required',
          },
        });
      }

      const sql = schemaFormatter.format(schema, databaseType || schema.databaseType);
      
      res.json({
        success: true,
        data: { sql },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all schema templates
   */
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = schemaGenerator.getTemplates();
      
      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a specific template by ID
   */
  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const template = schemaGenerator.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Template with ID "${id}" not found`,
          },
        });
      }
      
      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add a table to existing schema
   */
  async addTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { schema, tableDescription } = req.body;
      
      if (!schema || !tableDescription) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Schema and tableDescription are required',
          },
        });
      }

      const updatedSchema = await schemaGenerator.addTable(schema, tableDescription);
      const sql = schemaFormatter.format(updatedSchema, updatedSchema.databaseType);
      
      res.json({
        success: true,
        data: {
          schema: updatedSchema,
          sql,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Modify an existing table
   */
  async modifyTable(req: Request, res: Response, next: NextFunction) {
    try {
      const { schema, tableName, modifications } = req.body;
      
      if (!schema || !tableName || !modifications) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Schema, tableName, and modifications are required',
          },
        });
      }

      const updatedSchema = await schemaGenerator.modifyTable(schema, tableName, modifications);
      const sql = schemaFormatter.format(updatedSchema, updatedSchema.databaseType);
      
      res.json({
        success: true,
        data: {
          schema: updatedSchema,
          sql,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Optimize uploaded schema with AI recommendations
   */
  async optimize(req: Request, res: Response, next: NextFunction) {
    console.log('[SchemaController] Starting schema optimization...');
    
    try {
      const { schema } = req.body;
      
      if (!schema) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SCHEMA',
            message: 'Schema is required for optimization',
          },
        });
      }

      const optimized = await schemaGenerator.optimizeSchema(schema);
      
      res.json({
        success: true,
        data: {
          optimizedSchema: optimized.schema,
          suggestions: optimized.suggestions,
          improvements: optimized.improvements,
        },
      });
    } catch (error) {
      console.error('[SchemaController] Optimization error:', error);
      next(error);
    }
  },

  /**
   * Validate schema from visual designer
   */
  async validateSchema(req: Request, res: Response, next: NextFunction) {
    console.log('[SchemaController] Starting schema validation...');
    
    try {
      const { schema } = req.body;
      const issues: Array<{
        type: 'error' | 'warning' | 'info';
        message: string;
        table?: string;
        column?: string;
      }> = [];

      if (!schema || !schema.tables || !Array.isArray(schema.tables)) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'INVALID_SCHEMA',
            message: 'Invalid schema format',
          },
        });
      }

      // Validation rules
      schema.tables.forEach((table: any) => {
        // Check for table without primary key
        const hasPK = table.columns.some((col: any) => col.primaryKey);
        if (!hasPK) {
          issues.push({
            type: 'warning',
            message: 'Table has no primary key defined',
            table: table.name,
          });
        }

        // Check for duplicate column names
        const columnNames = table.columns.map((col: any) => col.name.toLowerCase());
        const duplicates = columnNames.filter((name: string, index: number) => 
          columnNames.indexOf(name) !== index
        );
        if (duplicates.length > 0) {
          issues.push({
            type: 'error',
            message: `Duplicate column names: ${duplicates.join(', ')}`,
            table: table.name,
          });
        }

        // Check for foreign key references to non-existent tables
        table.columns.forEach((col: any) => {
          // Check for invalid column names
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.name)) {
            issues.push({
              type: 'error',
              message: `Invalid column name: ${col.name}. Must start with letter or underscore`,
              table: table.name,
              column: col.name,
            });
          }

          // Check for reserved keywords
          const reservedKeywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'TABLE', 'INDEX', 'USER', 'ORDER', 'GROUP'];
          if (reservedKeywords.includes(col.name.toUpperCase())) {
            issues.push({
              type: 'warning',
              message: `Column name "${col.name}" is a SQL reserved keyword`,
              table: table.name,
              column: col.name,
            });
          }

          // Check column name length
          if (col.name.length > 63) {
            issues.push({
              type: 'error',
              message: 'Column name exceeds maximum length of 63 characters',
              table: table.name,
              column: col.name,
            });
          }

          // Check for nullable primary keys
          if (col.primaryKey && col.nullable) {
            issues.push({
              type: 'error',
              message: 'Primary key column cannot be nullable',
              table: table.name,
              column: col.name,
            });
          }

          if (col.references) {
            const refTable = schema.tables.find((t: any) => t.name === col.references.table);
            if (!refTable) {
              issues.push({
                type: 'error',
                message: `Foreign key references non-existent table: ${col.references.table}`,
                table: table.name,
                column: col.name,
              });
            } else {
              // Check if referenced column exists
              const refColumn = refTable.columns.find((c: any) => c.name === col.references.column);
              if (!refColumn) {
                issues.push({
                  type: 'error',
                  message: `Foreign key references non-existent column: ${col.references.table}.${col.references.column}`,
                  table: table.name,
                  column: col.name,
                });
              } else {
                // Check if referenced column is primary key or unique
                if (!refColumn.primaryKey && !refColumn.unique) {
                  issues.push({
                    type: 'warning',
                    message: `Foreign key references column that is neither primary key nor unique`,
                    table: table.name,
                    column: col.name,
                  });
                }

                // Check for type mismatch
                if (col.type !== refColumn.type) {
                  issues.push({
                    type: 'warning',
                    message: `Foreign key type (${col.type}) differs from referenced column type (${refColumn.type})`,
                    table: table.name,
                    column: col.name,
                  });
                }
              }
            }
          }
        });

        // Check for tables without indexes on foreign keys
        table.columns.forEach((col: any) => {
          if (col.references) {
            const hasIndex = table.indexes?.some((idx: any) => 
              idx.columns.includes(col.name)
            );
            if (!hasIndex) {
              issues.push({
                type: 'info',
                message: `Consider adding an index on foreign key column`,
                table: table.name,
                column: col.name,
              });
            }
          }
        });

        // Check for very long table names
        if (table.name.length > 63) {
          issues.push({
            type: 'warning',
            message: 'Table name exceeds PostgreSQL limit of 63 characters',
            table: table.name,
          });
        }

        // Check for tables with too many columns
        if (table.columns.length > 100) {
          issues.push({
            type: 'warning',
            message: 'Table has more than 100 columns - consider normalization',
            table: table.name,
          });
        }
      });

      // Check for circular references
      const checkCircularReferences = (tableName: string, visited: Set<string> = new Set()): boolean => {
        if (visited.has(tableName)) return true;
        visited.add(tableName);

        const table = schema.tables.find((t: any) => t.name === tableName);
        if (!table) return false;

        for (const col of table.columns) {
          if (col.references && checkCircularReferences(col.references.table, new Set(visited))) {
            return true;
          }
        }
        return false;
      };

      schema.tables.forEach((table: any) => {
        if (checkCircularReferences(table.name)) {
          issues.push({
            type: 'warning',
            message: 'Circular reference detected in foreign keys',
            table: table.name,
          });
        }
      });

      res.json({
        success: true,
        data: {
          valid: issues.filter(i => i.type === 'error').length === 0,
          issues,
          summary: {
            errors: issues.filter(i => i.type === 'error').length,
            warnings: issues.filter(i => i.type === 'warning').length,
            info: issues.filter(i => i.type === 'info').length,
          },
        },
      });
    } catch (error: any) {
      console.error('[SchemaController] Validation error:', error);
      next(error);
    }
  },

  /**
   * Export visual schema diagram as SVG or PNG
   */
  async exportDiagram(req: Request, res: Response, next: NextFunction) {
    console.log('[SchemaController] Starting diagram export...');
    
    try {
      const { schema, format = 'svg', tablePositions } = req.body;

      if (!schema || !schema.tables) {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'INVALID_SCHEMA',
            message: 'Invalid schema format',
          },
        });
      }

      if (format !== 'svg' && format !== 'png') {
        return res.status(400).json({ 
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Format must be "svg" or "png"',
          },
        });
      }

      // Generate SVG diagram
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="5000" height="3000">
  <defs>
    <style>
      .table-rect { fill: white; stroke: #e5e7eb; stroke-width: 2; }
      .table-header { fill: #3b82f6; }
      .table-text { fill: #111827; font-family: monospace; font-size: 14px; }
      .header-text { fill: white; font-family: sans-serif; font-size: 16px; font-weight: bold; }
      .relationship { stroke: #3b82f6; stroke-width: 2; fill: none; }
    </style>
  </defs>
  
  <rect width="5000" height="3000" fill="#f9fafb"/>
`;

      // Draw tables
      const TABLE_COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#ef4444', '#06b6d4', '#f59e0b'];
      
      schema.tables.forEach((table: any, idx: number) => {
        const pos = tablePositions?.[table.name] || { x: 100 + (idx % 3) * 500, y: 100 + Math.floor(idx / 3) * 500 };
        const color = TABLE_COLORS[idx % TABLE_COLORS.length];
        const height = 60 + table.columns.length * 35;

        // Table container
        svg += `
  <rect x="${pos.x}" y="${pos.y}" width="350" height="${height}" class="table-rect" rx="8"/>
  <rect x="${pos.x}" y="${pos.y}" width="350" height="40" fill="${color}" rx="8"/>
  <rect x="${pos.x}" y="${pos.y + 32}" width="350" height="8" fill="${color}"/>
  <text x="${pos.x + 15}" y="${pos.y + 26}" class="header-text">${table.name}</text>
`;

        // Columns
        table.columns.forEach((col: any, colIdx: number) => {
          const y = pos.y + 55 + colIdx * 35;
          svg += `
  <text x="${pos.x + 15}" y="${y}" class="table-text">${col.primaryKey ? '🔑 ' : col.references ? '🔗 ' : ''}${col.name}</text>
  <text x="${pos.x + 250}" y="${y}" class="table-text" fill="#6b7280">${col.type}</text>
`;
        });
      });

      // Draw relationships
      if (tablePositions) {
        schema.tables.forEach((table: any) => {
          table.columns.forEach((col: any) => {
            if (col.references) {
              const fromPos = tablePositions[table.name];
              const toPos = tablePositions[col.references.table];
              if (fromPos && toPos) {
                const fromX = fromPos.x + 175;
                const fromY = fromPos.y + 100;
                const toX = toPos.x + 175;
                const toY = toPos.y + 100;
                svg += `
  <path d="M ${fromX} ${fromY} C ${fromX + 50} ${fromY}, ${toX - 50} ${toY}, ${toX} ${toY}" class="relationship" marker-end="url(#arrowhead)"/>
`;
              }
            }
          });
        });
      }

      svg += `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
    </marker>
  </defs>
</svg>`;

      if (format === 'svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="${schema.name || 'schema'}-diagram.svg"`);
        res.send(svg);
      } else {
        // For PNG, we'd need a library like sharp or puppeteer
        res.json({
          success: true,
          data: {
            message: 'PNG export requires additional setup. SVG export available.',
            svg,
            note: 'Consider using svg-to-png conversion on the frontend',
          },
        });
      }
    } catch (error: any) {
      console.error('[SchemaController] Export error:', error);
      next(error);
    }
  },
};
