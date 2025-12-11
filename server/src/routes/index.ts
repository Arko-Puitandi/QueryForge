import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { schemaController } from '../controllers/schemaController.js';
import { queryController } from '../controllers/queryController.js';
import { codeController } from '../controllers/codeController.js';
import voiceRoutes from './voice.js';
import historyRoutes from './history.js';
import chatRoutes from './chat.js';
import visualDesignerRoutes from './visualDesigner.js';
import config from '../config/index.js';

const router = Router();

// ============ TEST API KEYS ROUTE ============
router.get('/test-keys', async (_req, res) => {
  const results: any[] = [];
  
  for (let i = 0; i < config.gemini.apiKeys.length; i++) {
    const key = config.gemini.apiKeys[i];
    const keyPrefix = key.substring(0, 15) + '...';
    
    try {
      console.log(`[TestKeys] Testing key ${i + 1}: ${keyPrefix}`);
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: config.gemini.model });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Say "Hello" in one word' }] }],
        generationConfig: { maxOutputTokens: 10 },
      });
      
      const response = result.response.text();
      console.log(`[TestKeys] Key ${i + 1} SUCCESS: ${response}`);
      results.push({ key: i + 1, prefix: keyPrefix, status: 'success', response });
    } catch (error: any) {
      console.error(`[TestKeys] Key ${i + 1} FAILED:`, error.message);
      results.push({ key: i + 1, prefix: keyPrefix, status: 'failed', error: error.message });
    }
  }
  
  res.json({
    model: config.gemini.model,
    totalKeys: config.gemini.apiKeys.length,
    results,
  });
});

// ============ VOICE ROUTES ============
router.use('/voice', voiceRoutes);

// ============ HISTORY ROUTES ============
router.use('/history', historyRoutes);

// ============ CHAT ROUTES ============
router.use('/chat', chatRoutes);

// ============ VISUAL DESIGNER ROUTES ============
router.use('/visual-designer', visualDesignerRoutes);

// ============ SCHEMA ROUTES ============
router.post('/schema/generate', schemaController.generate);
router.post('/schema/validate', schemaController.validate);
router.post('/schema/convert', schemaController.convert);
router.post('/schema/format', schemaController.format);
router.post('/schema/optimize', schemaController.optimize);
router.get('/schema/templates', schemaController.getTemplates);
router.get('/schema/templates/:id', schemaController.getTemplate);
router.post('/schema/add-table', schemaController.addTable);
router.post('/schema/modify-table', schemaController.modifyTable);
router.post('/schema/validate-designer', schemaController.validateSchema);
router.post('/schema/export-diagram', schemaController.exportDiagram);

// ============ QUERY ROUTES ============
router.post('/query/generate', queryController.generate);
router.post('/query/crud', queryController.generateCRUD);
router.post('/query/analyze', queryController.analyze);
router.post('/query/optimize', queryController.optimize);
router.post('/query/explain', queryController.explain);
router.post('/query/validate', queryController.validate);
router.post('/query/format', queryController.format);
router.post('/query/suggest-indexes', queryController.suggestIndexes);
router.post('/query/chat', queryController.chat);

// ============ CODE ROUTES ============
router.post('/code/generate', codeController.generate);
router.post('/code/entities', codeController.generateEntities);
router.post('/code/prisma', codeController.generatePrisma);
router.post('/code/typeorm', codeController.generateTypeORM);
router.post('/code/sqlalchemy', codeController.generateSQLAlchemy);
router.post('/code/jpa', codeController.generateJPA);
router.post('/code/download', codeController.download);
router.get('/code/frameworks', codeController.getFrameworks);
router.get('/code/frameworks/:language', codeController.getFrameworks);

// ============ HEALTH CHECK ============
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

export default router;
