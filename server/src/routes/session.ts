import { Router, Request, Response } from 'express';
import { historyDb } from '../services/database/historyDatabase.js';

const router = Router();

// In-memory session state (in production, use Redis or database)
interface SessionState {
  activeSchemaId: number | null;
  activeSchema: any | null;
  generatedSql: string | null;
  databaseType: string;
  selectedLanguage: string;
  naturalLanguageInput: string;
  generatedQuery: any | null;
  queryAnalysis: any | null;
  lastUpdated: Date;
}

// Simple in-memory store (single user for now)
let sessionState: SessionState = {
  activeSchemaId: null,
  activeSchema: null,
  generatedSql: null,
  databaseType: 'postgresql',
  selectedLanguage: 'nodejs',
  naturalLanguageInput: '',
  generatedQuery: null,
  queryAnalysis: null,
  lastUpdated: new Date(),
};

// ============ GET SESSION STATE ============
router.get('/state', (_req: Request, res: Response) => {
  try {
    console.log('[Session] Getting session state');
    res.json({
      success: true,
      data: {
        ...sessionState,
        hasActiveSchema: sessionState.activeSchema !== null,
      },
    });
  } catch (error: any) {
    console.error('[Session] Error getting state:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ SET ACTIVE SCHEMA ============
router.post('/schema', (req: Request, res: Response) => {
  try {
    const { schemaId, schema, generatedSql, databaseType } = req.body;
    
    console.log('[Session] Setting active schema:', schemaId || 'new schema');
    
    // Save to session state
    sessionState = {
      ...sessionState,
      activeSchemaId: schemaId || null,
      activeSchema: schema,
      generatedSql: generatedSql || null,
      databaseType: databaseType || sessionState.databaseType,
      // Reset query state when schema changes
      naturalLanguageInput: '',
      generatedQuery: null,
      queryAnalysis: null,
      lastUpdated: new Date(),
    };
    
    res.json({
      success: true,
      data: {
        message: 'Schema activated successfully',
        schemaId: sessionState.activeSchemaId,
        hasActiveSchema: true,
      },
    });
  } catch (error: any) {
    console.error('[Session] Error setting schema:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ LOAD SCHEMA FROM HISTORY ============
router.post('/schema/load/:id', (req: Request, res: Response) => {
  try {
    const schemaId = parseInt(req.params.id);
    console.log('[Session] Loading schema from history:', schemaId);
    
    const schemaEntry = historyDb.getSchemaById(schemaId);
    
    if (!schemaEntry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Schema not found in history' },
      });
    }
    
    const schema = JSON.parse(schemaEntry.schemaJson);
    
    // Update session state with loaded schema
    sessionState = {
      ...sessionState,
      activeSchemaId: schemaId,
      activeSchema: schema,
      generatedSql: schemaEntry.sqlOutput,
      databaseType: schemaEntry.databaseType,
      // Reset query state when schema changes
      naturalLanguageInput: '',
      generatedQuery: null,
      queryAnalysis: null,
      lastUpdated: new Date(),
    };
    
    res.json({
      success: true,
      data: {
        schema,
        generatedSql: schemaEntry.sqlOutput,
        databaseType: schemaEntry.databaseType,
        description: schemaEntry.description,
        message: 'Schema loaded successfully',
      },
    });
  } catch (error: any) {
    console.error('[Session] Error loading schema:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ LOAD SCHEMA FROM VISUAL DESIGNER ============
router.post('/schema/load-visual/:id', (req: Request, res: Response) => {
  try {
    const schemaId = parseInt(req.params.id);
    console.log('[Session] Loading schema from visual designer:', schemaId);
    
    const schemaEntry = historyDb.getVisualDesignerSchemaById(schemaId);
    
    if (!schemaEntry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Visual schema not found' },
      });
    }
    
    // Parse tables and build schema object
    const tables = typeof schemaEntry.tablesJson === 'string' 
      ? JSON.parse(schemaEntry.tablesJson) 
      : schemaEntry.tablesJson;
    
    const schema = {
      name: schemaEntry.name,
      description: schemaEntry.description,
      databaseType: schemaEntry.databaseType,
      tables: tables,
    };
    
    // Update session state
    sessionState = {
      ...sessionState,
      activeSchemaId: schemaId,
      activeSchema: schema,
      generatedSql: null, // Visual schemas don't have pre-generated SQL
      databaseType: schemaEntry.databaseType,
      // Reset query state when schema changes
      naturalLanguageInput: '',
      generatedQuery: null,
      queryAnalysis: null,
      lastUpdated: new Date(),
    };
    
    res.json({
      success: true,
      data: {
        schema,
        databaseType: schemaEntry.databaseType,
        message: 'Visual schema loaded successfully',
      },
    });
  } catch (error: any) {
    console.error('[Session] Error loading visual schema:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ CLEAR ACTIVE SCHEMA ============
router.delete('/schema', (_req: Request, res: Response) => {
  try {
    console.log('[Session] Clearing active schema');
    
    sessionState = {
      ...sessionState,
      activeSchemaId: null,
      activeSchema: null,
      generatedSql: null,
      naturalLanguageInput: '',
      generatedQuery: null,
      queryAnalysis: null,
      lastUpdated: new Date(),
    };
    
    res.json({
      success: true,
      data: { message: 'Schema cleared successfully' },
    });
  } catch (error: any) {
    console.error('[Session] Error clearing schema:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ UPDATE QUERY STATE ============
router.post('/query', (req: Request, res: Response) => {
  try {
    const { naturalLanguageInput, generatedQuery, queryAnalysis } = req.body;
    
    // Check if schema is loaded
    if (!sessionState.activeSchema) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'No active schema. Please load a schema first.',
          code: 'NO_SCHEMA' 
        },
      });
    }
    
    console.log('[Session] Updating query state');
    
    sessionState = {
      ...sessionState,
      naturalLanguageInput: naturalLanguageInput ?? sessionState.naturalLanguageInput,
      generatedQuery: generatedQuery ?? sessionState.generatedQuery,
      queryAnalysis: queryAnalysis ?? sessionState.queryAnalysis,
      lastUpdated: new Date(),
    };
    
    res.json({
      success: true,
      data: { message: 'Query state updated' },
    });
  } catch (error: any) {
    console.error('[Session] Error updating query state:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ UPDATE SETTINGS ============
router.post('/settings', (req: Request, res: Response) => {
  try {
    const { databaseType, selectedLanguage } = req.body;
    
    console.log('[Session] Updating settings');
    
    if (databaseType) {
      sessionState.databaseType = databaseType;
    }
    if (selectedLanguage) {
      sessionState.selectedLanguage = selectedLanguage;
    }
    sessionState.lastUpdated = new Date();
    
    res.json({
      success: true,
      data: { message: 'Settings updated' },
    });
  } catch (error: any) {
    console.error('[Session] Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ RESET SESSION ============
router.post('/reset', (_req: Request, res: Response) => {
  try {
    console.log('[Session] Resetting session');
    
    sessionState = {
      activeSchemaId: null,
      activeSchema: null,
      generatedSql: null,
      databaseType: 'postgresql',
      selectedLanguage: 'nodejs',
      naturalLanguageInput: '',
      generatedQuery: null,
      queryAnalysis: null,
      lastUpdated: new Date(),
    };
    
    res.json({
      success: true,
      data: { message: 'Session reset successfully' },
    });
  } catch (error: any) {
    console.error('[Session] Error resetting session:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

// ============ CHECK SCHEMA STATUS ============
router.get('/schema/status', (_req: Request, res: Response) => {
  try {
    const hasSchema = sessionState.activeSchema !== null;
    const tableCount = hasSchema ? (sessionState.activeSchema.tables?.length || 0) : 0;
    
    res.json({
      success: true,
      data: {
        hasActiveSchema: hasSchema,
        schemaId: sessionState.activeSchemaId,
        schemaName: hasSchema ? (sessionState.activeSchema.name || 'Untitled Schema') : null,
        tableCount,
        databaseType: sessionState.databaseType,
      },
    });
  } catch (error: any) {
    console.error('[Session] Error checking schema status:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
});

export default router;
