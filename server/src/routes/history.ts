import { Router, Request, Response } from 'express';
import { historyDb } from '../services/database/historyDatabase.js';

const router = Router();

// ============ SCHEMA HISTORY ============

// Get all schema history
router.get('/schema', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = historyDb.getSchemaHistory(limit, offset);
    
    res.json({
      success: true,
      data: history,
      metadata: {
        limit,
        offset,
        count: history.length,
      },
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching schema history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Get single schema history entry
router.get('/schema/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const entry = historyDb.getSchemaById(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Schema history entry not found' },
      });
    }
    
    res.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching schema entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Delete schema history entry (and related queries)
router.delete('/schema/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = historyDb.deleteSchemaHistory(id);
    
    if (!result.schemaDeleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Schema history entry not found' },
      });
    }
    
    res.json({
      success: true,
      message: `Schema deleted along with ${result.queriesDeleted} related queries`,
      data: result,
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error deleting schema entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Clear all schema history
router.delete('/schema', (req: Request, res: Response) => {
  try {
    historyDb.clearSchemaHistory();
    res.json({
      success: true,
      message: 'All schema history cleared',
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error clearing schema history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// ============ QUERY HISTORY ============

// Get all query history
router.get('/query', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = historyDb.getQueryHistory(limit, offset);
    
    res.json({
      success: true,
      data: history,
      metadata: {
        limit,
        offset,
        count: history.length,
      },
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching query history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Get recent queries (for dashboard)
router.get('/query/recent', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const history = historyDb.getQueryHistory(limit, 0);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching recent queries:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Get single query history entry
router.get('/query/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const entry = historyDb.getQueryById(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Query history entry not found' },
      });
    }
    
    res.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching query entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Delete query history entry
router.delete('/query/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = historyDb.deleteQueryHistory(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Query history entry not found' },
      });
    }
    
    res.json({
      success: true,
      message: 'Query history entry deleted',
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error deleting query entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Update query history entry (for replacing with optimized query)
router.put('/query/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { sql_query } = req.body;
    
    if (!sql_query) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sql_query is required' },
      });
    }
    
    const updated = historyDb.updateQueryHistory(id, { sqlQuery: sql_query });
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Query history entry not found' },
      });
    }
    
    res.json({
      success: true,
      message: 'Query updated successfully',
      data: { id },
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error updating query entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Clear all query history
router.delete('/query', (req: Request, res: Response) => {
  try {
    historyDb.clearQueryHistory();
    res.json({
      success: true,
      message: 'All query history cleared',
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error clearing query history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// ============ CODE GENERATION HISTORY ============

// Get all code generation history
router.get('/code', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = historyDb.getCodeGenerationHistory(limit, offset);
    
    res.json({
      success: true,
      data: history,
      metadata: {
        limit,
        offset,
        count: history.length,
      },
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching code generation history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Get single code generation history entry
router.get('/code/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const entry = historyDb.getCodeGenerationById(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Code generation history entry not found' },
      });
    }
    
    res.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching code generation entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Delete code generation history entry
router.delete('/code/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = historyDb.deleteCodeGenerationHistory(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Code generation history entry not found' },
      });
    }
    
    res.json({
      success: true,
      message: 'Code generation history entry deleted',
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error deleting code generation entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Clear all code generation history
router.delete('/code', (req: Request, res: Response) => {
  try {
    historyDb.clearCodeGenerationHistory();
    res.json({
      success: true,
      message: 'All code generation history cleared',
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error clearing code generation history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// ============ COMBINED ============

// Get statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = historyDb.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Search history
router.get('/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const type = (req.query.type as 'schema' | 'query' | 'code' | 'all') || 'all';
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Search query is required' },
      });
    }
    
    const results = historyDb.searchHistory(query, type);
    
    res.json({
      success: true,
      data: results,
      metadata: {
        query,
        type,
        count: results.length,
      },
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error searching history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

// Clear ALL history (schemas and queries)
router.delete('/all', (req: Request, res: Response) => {
  try {
    const result = historyDb.clearAllHistory();
    res.json({
      success: true,
      message: 'All history cleared',
      data: result,
    });
  } catch (error: any) {
    console.error('[HistoryRoutes] Error clearing all history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'HISTORY_ERROR', message: error.message },
    });
  }
});

export default router;
