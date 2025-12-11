import { Router } from 'express';
import { historyDb } from '../services/database/historyDatabase';
import { SQLGeneratorBackend } from '../utils/sqlGeneratorBackend';

const router = Router();

/**
 * Save visual query
 */
router.post('/save', async (req, res) => {
  try {
    const { visualQuery, databaseType } = req.body;

    if (!visualQuery || !visualQuery.name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Visual query with name is required',
        },
      });
    }

    // Generate SQL from visual query
    let generatedSql = '';
    try {
      const generator = new SQLGeneratorBackend(databaseType || 'postgresql');
      generatedSql = generator.generate(visualQuery);
    } catch (sqlError) {
      console.error('[Visual Query] SQL generation error:', sqlError);
      generatedSql = '-- Error generating SQL: ' + (sqlError instanceof Error ? sqlError.message : 'Unknown error');
    }

    const id = historyDb.saveVisualQuery({
      name: visualQuery.name,
      description: visualQuery.description,
      visualQueryJson: JSON.stringify(visualQuery),
      generatedSql,
      databaseType,
      status: 'success',
    });

    res.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('[Visual Query] Save error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SAVE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to save visual query',
      },
    });
  }
});

/**
 * Get visual query history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = historyDb.getVisualQueryHistory(limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('[Visual Query] Get history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch visual query history',
      },
    });
  }
});

/**
 * Get visual query by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const query = historyDb.getVisualQueryById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Visual query not found',
        },
      });
    }

    // Parse JSON fields
    query.visualQuery = JSON.parse(query.visualQueryJson);
    delete query.visualQueryJson;

    if (query.schemaContext) {
      query.schemaContext = JSON.parse(query.schemaContext);
    }

    res.json({
      success: true,
      data: query,
    });
  } catch (error) {
    console.error('[Visual Query] Get by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch visual query',
      },
    });
  }
});

/**
 * Delete visual query
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = historyDb.deleteVisualQuery(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Visual query not found',
        },
      });
    }

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('[Visual Query] Delete error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete visual query',
      },
    });
  }
});

export default router;
