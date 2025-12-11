import { Request, Response, NextFunction } from 'express';
import { codeGenerator } from '../services/code/codeGenerator.js';
import { CodeRequest } from '../types/index.js';
import { z } from 'zod';
import archiver from 'archiver';
import { historyDb } from '../services/database/historyDatabase.js';

// Validation schemas
const generateCodeSchema = z.object({
  schema: z.any(),
  language: z.enum(['java', 'python', 'nodejs', 'csharp', 'go']),
  framework: z.string(),
  options: z.object({
    includeRepository: z.boolean().optional(),
    includeService: z.boolean().optional(),
    includeController: z.boolean().optional(),
    includeMigration: z.boolean().optional(),
    includeDTO: z.boolean().optional(),
    includeValidation: z.boolean().optional(),
    includeComments: z.boolean().optional(),
    packageName: z.string().optional(),
    baseClass: z.string().optional(),
  }).optional(),
});

export const codeController = {
  /**
   * Generate complete code from schema
   */
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = generateCodeSchema.safeParse(req.body);
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

      const request: CodeRequest = validation.data as CodeRequest;
      const startTime = Date.now();
      
      const result = await codeGenerator.generateCode(request);
      const processingTime = Date.now() - startTime;

      // Save to history
      try {
        const description = `Generated ${request.language} ${request.framework} project template with ${result.files.length} files`;
        historyDb.saveCodeGenerationHistory({
          description,
          language: request.language,
          framework: request.framework,
          optionsJson: JSON.stringify(request.options || {}),
          schemaJson: JSON.stringify(request.schema),
          filesJson: JSON.stringify(result.files),
          fileCount: result.files.length,
          status: 'success',
          processingTime,
        });
      } catch (historyError) {
        console.error('[CodeController] Failed to save history:', historyError);
        // Don't fail the request if history save fails
      }
      
      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate entity/model classes only
   */
  async generateEntities(req: Request, res: Response, next: NextFunction) {
    try {
      const { schema, language, framework, options } = req.body;
      
      if (!schema || !language || !framework) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Schema, language, and framework are required',
          },
        });
      }

      const startTime = Date.now();
      const entities = await codeGenerator.generateEntities(schema, language, framework, options);
      
      res.json({
        success: true,
        data: { files: entities },
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
   * Generate Prisma schema
   */
  async generatePrisma(req: Request, res: Response, next: NextFunction) {
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

      const prismaSchema = codeGenerator.generatePrismaSchema(schema);
      
      res.json({
        success: true,
        data: {
          files: [{
            path: 'prisma/',
            filename: 'schema.prisma',
            content: prismaSchema,
            type: 'config',
          }],
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate TypeORM entities
   */
  async generateTypeORM(req: Request, res: Response, next: NextFunction) {
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

      const entities = codeGenerator.generateTypeORMEntities(schema);
      
      res.json({
        success: true,
        data: { files: entities },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate SQLAlchemy models (Python)
   */
  async generateSQLAlchemy(req: Request, res: Response, next: NextFunction) {
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

      const models = codeGenerator.generateSQLAlchemyModels(schema);
      
      res.json({
        success: true,
        data: { files: models },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate JPA entities (Java)
   */
  async generateJPA(req: Request, res: Response, next: NextFunction) {
    try {
      const { schema, packageName } = req.body;
      
      if (!schema) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SCHEMA',
            message: 'Schema is required',
          },
        });
      }

      const entities = codeGenerator.generateJPAEntities(schema, packageName);
      
      res.json({
        success: true,
        data: { files: entities },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download generated code as ZIP
   */
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { files, projectName } = req.body;
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FILES',
            message: 'Files array is required',
          },
        });
      }

      const name = projectName || 'generated-code';
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${name}.zip"`);
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      
      for (const file of files) {
        const fullPath = `${file.path}${file.filename}`.replace(/^\//, '');
        archive.append(file.content, { name: fullPath });
      }
      
      await archive.finalize();
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get available frameworks for a language
   */
  async getFrameworks(req: Request, res: Response, _next: NextFunction) {
    const frameworks: Record<string, Array<{ id: string; name: string; description: string }>> = {
      java: [
        { id: 'spring-boot', name: 'Spring Boot + JPA', description: 'Full-featured Java framework with Hibernate ORM' },
        { id: 'quarkus', name: 'Quarkus + Panache', description: 'Kubernetes-native Java framework' },
        { id: 'micronaut', name: 'Micronaut', description: 'Modern JVM framework for microservices' },
      ],
      python: [
        { id: 'fastapi', name: 'FastAPI + SQLAlchemy', description: 'Modern, fast Python API framework' },
        { id: 'django', name: 'Django', description: 'Full-featured Python web framework' },
        { id: 'flask', name: 'Flask + SQLAlchemy', description: 'Lightweight Python web framework' },
      ],
      nodejs: [
        { id: 'express-prisma', name: 'Express + Prisma', description: 'Node.js with modern type-safe ORM' },
        { id: 'nestjs-typeorm', name: 'NestJS + TypeORM', description: 'Enterprise Node.js framework' },
        { id: 'fastify-sequelize', name: 'Fastify + Sequelize', description: 'Fast Node.js framework with Sequelize' },
      ],
      csharp: [
        { id: 'aspnet-efcore', name: 'ASP.NET Core + EF Core', description: '.NET web framework with Entity Framework' },
      ],
      go: [
        { id: 'gin-gorm', name: 'Gin + GORM', description: 'Fast Go web framework with GORM' },
        { id: 'echo-gorm', name: 'Echo + GORM', description: 'High performance Go framework' },
      ],
    };

    const { language } = req.params;
    
    if (language && frameworks[language]) {
      return res.json({
        success: true,
        data: frameworks[language],
      });
    }
    
    res.json({
      success: true,
      data: frameworks,
    });
  },
};
