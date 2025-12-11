import { Router, Request, Response } from 'express';
import { historyDb } from '../services/database/historyDatabase.js';

const router = Router();

// Get all visual designer schemas
router.get('/schemas', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const schemas = historyDb.getVisualDesignerSchemas(limit);
    
    res.json({
      success: true,
      data: schemas,
    });
  } catch (error: any) {
    console.error('[VisualDesigner] Error fetching schemas:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message,
      },
    });
  }
});

// Get a specific visual designer schema
router.get('/schemas/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const schema = historyDb.getVisualDesignerSchemaById(id);
    
    if (!schema) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Schema not found',
        },
      });
    }
    
    res.json({
      success: true,
      data: schema,
    });
  } catch (error: any) {
    console.error('[VisualDesigner] Error fetching schema:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message,
      },
    });
  }
});

// Save a new visual designer schema
router.post('/schemas', (req: Request, res: Response) => {
  try {
    const { name, description, databaseType, tables, tablePositions } = req.body;
    
    if (!name || !tables || !tablePositions) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, tables, and tablePositions are required',
        },
      });
    }
    
    const relationshipCount = tables.reduce((acc: number, table: any) => {
      return acc + table.columns.filter((col: any) => col.references).length;
    }, 0);
    
    const id = historyDb.saveVisualDesignerSchema({
      name,
      description,
      databaseType: databaseType || 'postgresql',
      tablesJson: JSON.stringify(tables),
      tablePositionsJson: JSON.stringify(tablePositions),
      tableCount: tables.length,
      relationshipCount,
    });
    
    res.json({
      success: true,
      data: {
        id,
        message: 'Schema saved successfully',
      },
    });
  } catch (error: any) {
    console.error('[VisualDesigner] Error saving schema:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SAVE_ERROR',
        message: error.message,
      },
    });
  }
});

// Update an existing visual designer schema
router.put('/schemas/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, databaseType, tables, tablePositions } = req.body;
    
    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (databaseType !== undefined) updates.databaseType = databaseType;
    
    if (tables !== undefined) {
      updates.tablesJson = JSON.stringify(tables);
      updates.tableCount = tables.length;
      updates.relationshipCount = tables.reduce((acc: number, table: any) => {
        return acc + table.columns.filter((col: any) => col.references).length;
      }, 0);
    }
    
    if (tablePositions !== undefined) {
      updates.tablePositionsJson = JSON.stringify(tablePositions);
    }
    
    const success = historyDb.updateVisualDesignerSchema(id, updates);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Schema not found or no changes made',
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        id,
        message: 'Schema updated successfully',
      },
    });
  } catch (error: any) {
    console.error('[VisualDesigner] Error updating schema:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message,
      },
    });
  }
});

// Delete a visual designer schema
router.delete('/schemas/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = historyDb.deleteVisualDesignerSchema(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Schema not found',
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        message: 'Schema deleted successfully',
      },
    });
  } catch (error: any) {
    console.error('[VisualDesigner] Error deleting schema:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;
