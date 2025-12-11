import React, { useState, useEffect } from 'react';
import { Button, Input, ConfirmModal } from '../components/common';
import { VisualSchemaDesigner, SchemaUploader } from '../components/schema';
import { useAppStore } from '../stores';
import { useNotificationStore } from '../stores';
import { Schema } from '../types';
import { Upload, Save, Plus, Download, FileJson, Database, Grid, Settings, FileUp, LayoutList, Eye, Trash2 } from 'lucide-react';
import { 
  saveVisualDesignerSchema, 
  updateVisualDesignerSchema, 
  getVisualDesignerSchemas,
  deleteVisualDesignerSchema 
} from '../services/api';

type ConfirmAction = 'delete' | 'cleanDuplicates' | 'reset' | null;

export const VisualDesignerPage: React.FC = () => {
  const { 
    currentSchema, 
    setCurrentSchema, 
    selectedDatabase, 
    syncSchemaToServer,
    setPendingSchemaChange,
  } = useAppStore();
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<'canvas' | 'overview' | 'import' | 'export' | 'settings' | 'saved'>('canvas');
  const [savedSchemas, setSavedSchemas] = useState<any[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [schemaName, setSchemaName] = useState('');
  const [currentSchemaId, setCurrentSchemaId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tablePositions, setTablePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [duplicateIds, setDuplicateIds] = useState<number[]>([]);

  // Load saved schemas from database on mount
  const loadSavedSchemas = async () => {
    try {
      const response = await getVisualDesignerSchemas();
      if (response.success && response.data) {
        console.log('Loaded schemas from database:', response.data.length);
        setSavedSchemas(response.data);
      }
    } catch (error) {
      console.error('Failed to load saved schemas:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load schemas from database',
      });
    }
  };

  useEffect(() => {
    loadSavedSchemas();
  }, []);

  // Sync schema name from currentSchema
  useEffect(() => {
    if (currentSchema && currentSchema.name) {
      setSchemaName(currentSchema.name);
    }
  }, [currentSchema?.name]);

  // Auto-save current schema
  useEffect(() => {
    if (!autoSaveEnabled || !currentSchema || !currentSchema.tables || currentSchema.tables.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      handleSaveSchema();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchema, autoSaveEnabled, tablePositions, schemaName]);

  const handleSaveSchema = async () => {
    if (!currentSchema || !currentSchema.tables || currentSchema.tables.length === 0) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'No schema to save',
      });
      return;
    }

    setIsSaving(true);

    try {
      const schemaData = {
        name: schemaName || currentSchema.name || 'Untitled Schema',
        description: currentSchema.description,
        databaseType: typeof selectedDatabase === 'string' ? selectedDatabase.toLowerCase() : 'postgresql',
        tables: currentSchema.tables,
        tablePositions: tablePositions || {},
      };

      let response;
      let schemaId = currentSchemaId;
      
      // If no currentSchemaId, check if a schema with the same name already exists
      if (!schemaId && savedSchemas.length > 0) {
        const existingSchema = savedSchemas.find(s => s.name === schemaData.name);
        if (existingSchema) {
          schemaId = existingSchema.id;
          setCurrentSchemaId(schemaId);
        }
      }
      
      if (schemaId) {
        // Update existing schema
        response = await updateVisualDesignerSchema(schemaId, schemaData);
        console.log('Updated schema:', schemaId);
        addNotification({
          type: 'success',
          title: 'Schema Updated',
          message: `Schema "${schemaData.name}" updated in database`,
        });
      } else {
        // Create new schema
        response = await saveVisualDesignerSchema(schemaData);
        console.log('Created new schema, ID:', response.data?.id);
        if (response.data?.id) {
          setCurrentSchemaId(response.data.id);
        }
        addNotification({
          type: 'success',
          title: 'Schema Saved',
          message: `Schema "${schemaData.name}" saved to database`,
        });
      }

      // Reload schemas list
      await loadSavedSchemas();
    } catch (error: any) {
      console.error('Failed to save schema:', error);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: error.response?.data?.error?.message || 'Failed to save schema to database',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewSchema = () => {
    setCurrentSchema({
      name: 'New Schema',
      tables: [],
      databaseType: 'postgresql',
      relationships: [],
      createdAt: new Date(),
    });
    setSchemaName('New Schema');
    setCurrentSchemaId(null);
    setTablePositions({});
    setActiveTab('canvas'); // Switch to canvas
    addNotification({
      type: 'info',
      title: 'New Schema',
      message: 'Started new schema',
    });
  };

  const handleSchemaUpload = async (schema: any, metadata: { filename: string; type: string }) => {
    const importedSchema: Schema = {
      name: metadata.filename.replace(/\.(json|sql)$/, ''),
      tables: schema.tables || [],
      databaseType: schema.databaseType || 'postgresql',
      relationships: schema.relationships || [],
      createdAt: schema.createdAt ? new Date(schema.createdAt) : new Date(),
    };

    // Check if there's an existing schema - show confirmation
    if (currentSchema && currentSchema.tables && currentSchema.tables.length > 0) {
      setPendingSchemaChange({
        schema: importedSchema,
        databaseType: importedSchema.databaseType as any,
        description: `Imported from ${metadata.filename}`,
        source: 'import',
      });
      setShowImportModal(false);
      return;
    }

    // No existing schema, sync directly
    try {
      await syncSchemaToServer(importedSchema, undefined, undefined);
      setSchemaName(importedSchema.name);
      setCurrentSchemaId(null); // New imported schema
      setTablePositions(schema.tablePositions || {});
      setShowImportModal(false);

      addNotification({
        type: 'success',
        title: 'Schema Imported',
        message: `Schema imported from ${metadata.filename}`,
      });
    } catch (error) {
      console.error('Error syncing imported schema:', error);
      // Still set locally even if sync fails
      setCurrentSchema(importedSchema);
      setSchemaName(importedSchema.name);
      setCurrentSchemaId(null);
      setTablePositions(schema.tablePositions || {});
      setShowImportModal(false);
    }
  };

  const handleLoadSchema = async (schema: any) => {
    // Parse tables if it's still a JSON string
    const tables = typeof schema.tables === 'string' ? JSON.parse(schema.tables) : (schema.tables || []);
    const positions = typeof schema.tablePositions === 'string' ? JSON.parse(schema.tablePositions) : (schema.tablePositions || {});
    
    const loadedSchema: Schema = {
      name: schema.name,
      tables: tables,
      databaseType: schema.databaseType,
      relationships: schema.relationships || [],
      createdAt: schema.createdAt ? new Date(schema.createdAt) : new Date(),
      description: schema.description,
    };

    // Check if there's an existing schema - show confirmation
    if (currentSchema && currentSchema.tables && currentSchema.tables.length > 0 && currentSchemaId !== schema.id) {
      setPendingSchemaChange({
        schema: loadedSchema,
        schemaId: schema.id,
        databaseType: schema.databaseType as any,
        description: schema.description || schema.name,
        source: 'visual',
      });
      return;
    }

    // No existing schema or same schema, sync directly
    try {
      await syncSchemaToServer(loadedSchema, schema.id, undefined);
      setSchemaName(schema.name);
      setCurrentSchemaId(schema.id);
      setTablePositions(positions);
      setActiveTab('canvas'); // Switch to canvas after loading
      
      addNotification({
        type: 'info',
        title: 'Schema Loaded',
        message: `Loaded schema "${schema.name}"`,
      });
    } catch (error) {
      console.error('Error syncing loaded schema:', error);
      // Still set locally even if sync fails
      setCurrentSchema(loadedSchema);
      setSchemaName(schema.name);
      setCurrentSchemaId(schema.id);
      setTablePositions(positions);
      setActiveTab('canvas');
    }
  };

  const handleDeleteSchema = async (schemaId: number, schemaName: string) => {
    setDeleteTarget({ id: schemaId, name: schemaName });
    setConfirmAction('delete');
  };

  const executeDeleteSchema = async () => {
    if (!deleteTarget) return;

    try {
      await deleteVisualDesignerSchema(deleteTarget.id);
      await loadSavedSchemas();
      
      if (currentSchemaId === deleteTarget.id) {
        handleNewSchema();
      }

      addNotification({
        type: 'success',
        title: 'Schema Deleted',
        message: `Schema "${deleteTarget.name}" deleted`,
      });
    } catch (error) {
      console.error('Failed to delete schema:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete schema',
      });
    } finally {
      setDeleteTarget(null);
      setConfirmAction(null);
    }
  };

  const handleCleanDuplicates = async () => {
    // Group schemas by name, keep only the most recent one
    const schemasByName = new Map<string, any[]>();
    
    savedSchemas.forEach(schema => {
      const existing = schemasByName.get(schema.name) || [];
      existing.push(schema);
      schemasByName.set(schema.name, existing);
    });

    const foundDuplicateIds: number[] = [];
    
    schemasByName.forEach((schemas) => {
      if (schemas.length > 1) {
        // Sort by updated date descending, keep first (most recent)
        schemas.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt).getTime();
          return dateB - dateA;
        });
        
        // Mark all except the first as duplicates
        for (let i = 1; i < schemas.length; i++) {
          foundDuplicateIds.push(schemas[i].id);
        }
      }
    });

    if (foundDuplicateIds.length === 0) {
      addNotification({
        type: 'info',
        title: 'No Duplicates',
        message: 'No duplicate schemas found',
      });
      return;
    }

    setDuplicateCount(foundDuplicateIds.length);
    setDuplicateIds(foundDuplicateIds);
    setConfirmAction('cleanDuplicates');
  };

  const executeCleanDuplicates = async () => {
    try {
      for (const id of duplicateIds) {
        await deleteVisualDesignerSchema(id);
      }
      
      await loadSavedSchemas();
      
      addNotification({
        type: 'success',
        title: 'Duplicates Removed',
        message: `Deleted ${duplicateIds.length} duplicate schema(s)`,
      });
    } catch (error) {
      console.error('Failed to clean duplicates:', error);
      addNotification({
        type: 'error',
        title: 'Cleanup Failed',
        message: 'Failed to remove duplicate schemas',
      });
    } finally {
      setDuplicateIds([]);
      setDuplicateCount(0);
      setConfirmAction(null);
    }
  };

  const handleExportSchema = () => {
    if (!currentSchema || currentSchema.tables.length === 0) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'No schema to export',
      });
      return;
    }

    const dataStr = JSON.stringify(currentSchema, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemaName || 'schema'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({
      type: 'success',
      title: 'Schema Exported',
      message: 'Schema exported successfully',
    });
  };

  const handleReset = () => {
    setConfirmAction('reset');
  };

  const executeReset = () => {
    handleNewSchema();
    addNotification({
      type: 'info',
      message: 'Schema reset successfully',
    });
    setConfirmAction(null);
  };

  const getConfirmModalProps = () => {
    switch (confirmAction) {
      case 'delete':
        return {
          title: 'Delete Schema',
          message: `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`,
          variant: 'danger' as const,
          confirmText: 'Delete Schema',
          onConfirm: executeDeleteSchema,
        };
      case 'cleanDuplicates':
        return {
          title: 'Clean Duplicate Schemas',
          message: `Found ${duplicateCount} duplicate schema(s). The most recent version of each will be kept. Delete the older duplicates?`,
          variant: 'warning' as const,
          confirmText: 'Clean Duplicates',
          onConfirm: executeCleanDuplicates,
        };
      case 'reset':
        return {
          title: 'Reset Schema',
          message: 'Are you sure you want to reset the schema? All tables, columns, and relationships will be cleared. This action cannot be undone.',
          variant: 'warning' as const,
          confirmText: 'Reset Schema',
          onConfirm: executeReset,
        };
      default:
        return {
          title: '',
          message: '',
          variant: 'warning' as const,
          confirmText: 'Confirm',
          onConfirm: () => setConfirmAction(null),
        };
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Compact Top Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Schema Name */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <Input
                value={schemaName || 'Untitled Schema'}
                onChange={(e) => setSchemaName(e.target.value)}
                placeholder="Schema Name"
                className="text-sm font-semibold border-0 bg-transparent focus:bg-gray-50 dark:focus:bg-gray-700 px-2"
              />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentSchema?.tables?.length || 0} Tables
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 dark:text-gray-400">Columns:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentSchema?.tables?.reduce((acc, t) => acc + t.columns.length, 0) || 0}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 dark:text-gray-400">DB:</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {selectedDatabase}
                </span>
              </div>
            </div>

            {/* Auto-save toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 w-3.5 h-3.5"
              />
              <span>Auto-save</span>
            </label>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button onClick={handleSaveSchema} variant="primary" size="sm" disabled={isSaving || !currentSchema}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={handleNewSchema} variant="secondary" size="sm">
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button onClick={handleReset} variant="secondary" size="sm">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Compact Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Minimal Left Sidebar - Tab Navigation */}
        <div className="w-14 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 gap-2">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all group ${
              activeTab === 'canvas'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Visual Canvas"
          >
            <Grid className="w-5 h-5" />
            {currentSchema?.tables && currentSchema.tables.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {currentSchema.tables.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Schema Overview"
          >
            <LayoutList className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'saved'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Saved Schemas"
          >
            <Database className="w-5 h-5" />
            {savedSchemas.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {savedSchemas.length}
              </span>
            )}
          </button>

          <div className="h-px bg-gray-300 dark:bg-gray-600 w-8 my-2" />

          <button
            onClick={() => setActiveTab('import')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'import'
                ? 'bg-green-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Import Schema"
          >
            <FileUp className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Export Schema"
          >
            <Download className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'canvas' && (
            <div className="flex-1 h-full bg-gray-50 dark:bg-gray-900">
              {currentSchema && currentSchema.tables && currentSchema.tables.length > 0 ? (
                <VisualSchemaDesigner
                  tables={currentSchema.tables}
                  initialPositions={tablePositions}
                  onTablesChange={(updatedTables: any) => {
                    if (currentSchema) {
                      setCurrentSchema({
                        ...currentSchema,
                        tables: updatedTables,
                      });
                    }
                  }}
                  onPositionsChange={setTablePositions}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center max-w-md">
                    <Grid className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No Schema Loaded
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      Create a new schema or load an existing one to start designing
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Button onClick={handleNewSchema} variant="primary">
                        <Plus className="w-4 h-4 mr-2" />
                        New Schema
                      </Button>
                      <Button variant="secondary" onClick={() => setActiveTab('saved')}>
                        <Database className="w-4 h-4 mr-2" />
                        Load Schema
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-6xl mx-auto">
                {currentSchema && currentSchema.tables && currentSchema.tables.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        Schema Overview
                      </h2>
                      
                      {/* Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {currentSchema.tables.length}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tables</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {currentSchema.tables.reduce((acc, t) => acc + t.columns.length, 0)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Columns</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {currentSchema.relationships?.length || currentSchema.tables.reduce((acc, t) => acc + t.columns.filter(c => c.references).length, 0)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Relations</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                            {currentSchema.tables.reduce((acc, t) => acc + (t.indexes?.length || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Indexes</div>
                        </div>
                      </div>

                      {/* Tables List */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tables</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentSchema.tables.map((table, idx) => {
                            const primaryKeys = table.columns.filter((c) => c.primaryKey).length;
                            const foreignKeys = table.columns.filter((c) => c.references).length;
                            const colorIndex = idx % 10;
                            const colors = [
                              'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
                              'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
                              'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
                              'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
                              'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
                              'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700',
                              'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700',
                              'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
                              'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700',
                              'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
                            ];

                            return (
                              <div
                                key={table.name}
                                className={`rounded-lg border-2 p-4 ${colors[colorIndex]}`}
                              >
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                  {table.name}
                                </h4>
                                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                  <div className="flex items-center justify-between">
                                    <span>Columns:</span>
                                    <span className="font-medium">{table.columns.length}</span>
                                  </div>
                                  {primaryKeys > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span>🔑 Primary Keys:</span>
                                      <span className="font-medium">{primaryKeys}</span>
                                    </div>
                                  )}
                                  {foreignKeys > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span>🔗 Foreign Keys:</span>
                                      <span className="font-medium">{foreignKeys}</span>
                                    </div>
                                  )}
                                  {table.indexes && table.indexes.length > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span>📑 Indexes:</span>
                                      <span className="font-medium">{table.indexes.length}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <LayoutList className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Schema to Overview
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Create a schema first to see the overview
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Saved Schemas
                    </h2>
                    {savedSchemas.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCleanDuplicates}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clean Duplicates
                      </Button>
                    )}
                  </div>
                  {savedSchemas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {savedSchemas.map((schema) => (
                        <div
                          key={schema.id}
                          className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group relative"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchema(schema.id, schema.name);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 dark:hover:bg-red-900/50"
                            title="Delete schema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div onClick={() => handleLoadSchema(schema)}>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 pr-8">{schema.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {schema.tableCount || schema.tables?.length || 0} tables • {schema.databaseType}
                            </p>
                            {schema.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {schema.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Database className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                      <p className="text-gray-600 dark:text-gray-400">No saved schemas yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Import Schema
                  </h2>
                  <SchemaUploader
                    onSchemaUpload={handleSchemaUpload}
                    onOptimize={() => {}}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Export Schema
                  </h2>
                  {currentSchema && currentSchema.tables && currentSchema.tables.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        Export your schema as a JSON file to share or backup.
                      </p>
                      <Button onClick={handleExportSchema} size="lg" className="w-full">
                        <Download className="w-5 h-5 mr-2" />
                        Export as JSON
                      </Button>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                          Export Details
                        </h4>
                        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                          <li>• Schema name: {schemaName || 'Untitled Schema'}</li>
                          <li>• Tables: {currentSchema.tables.length}</li>
                          <li>• Database type: {selectedDatabase}</li>
                          <li>• Format: JSON</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileJson className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                      <p className="text-gray-600 dark:text-gray-400">No schema to export</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Designer Settings
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Database Type
                      </label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {selectedDatabase}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <input
                          type="checkbox"
                          checked={autoSaveEnabled}
                          onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            Auto-save Enabled
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Automatically save changes as you work
                          </div>
                        </div>
                      </label>
                    </div>

                    {currentSchemaId && (
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteSchema(currentSchemaId, schemaName)}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Current Schema
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => {
          setConfirmAction(null);
          setDeleteTarget(null);
          setDuplicateIds([]);
          setDuplicateCount(0);
        }}
        {...getConfirmModalProps()}
      />
    </div>
  );
};
