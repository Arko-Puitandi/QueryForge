import React, { useState, useEffect } from 'react';
import { Button } from '../components/common';
import { VisualSchemaDesigner, SchemaUploader } from '../components/schema';
import { useAppStore } from '../stores';
import { useNotificationStore } from '../stores';
import { Schema } from '../types';
import { Upload, Save, Plus, Download, FileJson, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  saveVisualDesignerSchema, 
  updateVisualDesignerSchema, 
  getVisualDesignerSchemas,
  deleteVisualDesignerSchema 
} from '../services/api';

export const VisualDesignerPage: React.FC = () => {
  const { currentSchema, setCurrentSchema, selectedDatabase } = useAppStore();
  const { addNotification } = useNotificationStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [savedSchemas, setSavedSchemas] = useState<any[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [currentSchemaId, setCurrentSchemaId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tablePositions, setTablePositions] = useState<Record<string, { x: number; y: number }>>({});

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
    if (!autoSaveEnabled || !currentSchema || currentSchema.tables.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      handleSaveSchema();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchema, autoSaveEnabled, tablePositions, schemaName]);

  const handleSaveSchema = async () => {
    if (!currentSchema || currentSchema.tables.length === 0) {
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
      if (currentSchemaId) {
        // Update existing schema
        response = await updateVisualDesignerSchema(currentSchemaId, schemaData);
        console.log('Updated schema:', currentSchemaId);
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
    addNotification({
      type: 'info',
      title: 'New Schema',
      message: 'Started new schema',
    });
  };

  const handleSchemaUpload = (schema: any, metadata: { filename: string; type: string }) => {
    const importedSchema: Schema = {
      name: metadata.filename.replace(/\.(json|sql)$/, ''),
      tables: schema.tables || [],
      databaseType: schema.databaseType || 'postgresql',
      relationships: schema.relationships || [],
      createdAt: schema.createdAt ? new Date(schema.createdAt) : new Date(),
    };

    setCurrentSchema(importedSchema);
    setSchemaName(importedSchema.name);
    setCurrentSchemaId(null); // New imported schema
    setTablePositions(schema.tablePositions || {});
    setShowImportModal(false);

    addNotification({
      type: 'success',
      title: 'Schema Imported',
      message: `Schema imported from ${metadata.filename}`,
    });
  };

  const handleLoadSchema = (schema: any) => {
    setCurrentSchema({
      name: schema.name,
      tables: schema.tables,
      databaseType: schema.databaseType,
      relationships: schema.relationships || [],
      createdAt: schema.createdAt ? new Date(schema.createdAt) : new Date(),
      description: schema.description,
    });
    setSchemaName(schema.name);
    setCurrentSchemaId(schema.id);
    setTablePositions(schema.tablePositions || {});
    
    addNotification({
      type: 'info',
      title: 'Schema Loaded',
      message: `Loaded schema "${schema.name}"`,
    });
  };

  const handleDeleteSchema = async (schemaId: number, schemaName: string) => {
    if (!confirm(`Are you sure you want to delete "${schemaName}"?`)) {
      return;
    }

    try {
      await deleteVisualDesignerSchema(schemaId);
      await loadSavedSchemas();
      
      if (currentSchemaId === schemaId) {
        handleNewSchema();
      }

      addNotification({
        type: 'success',
        title: 'Schema Deleted',
        message: `Schema "${schemaName}" deleted`,
      });
    } catch (error) {
      console.error('Failed to delete schema:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete schema',
      });
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

  return (
    <div className="h-full -m-6 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visual Schema Designer</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Design and manage database schemas visually
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Auto-save toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-save</span>
            </label>

            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportSchema}>
              <Download className="w-4 h-4 mr-1.5" />
              Export
            </Button>

            <Button variant="outline" size="sm" onClick={handleSaveSchema} disabled={isSaving}>
              <Save className="w-4 h-4 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>

            <Button size="sm" onClick={handleNewSchema}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Schema
            </Button>
          </div>
        </div>

        {/* Schema Controls */}
        <div className="mt-4 flex items-center gap-4">
          {/* Schema Name */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              placeholder="Schema name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Delete Current Schema Button */}
          {currentSchemaId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteSchema(currentSchemaId, schemaName)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete Schema
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Visual Designer */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900">
          {currentSchema && currentSchema.tables ? (
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
              <div className="text-center max-w-2xl">
                <FileJson className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Schema Loaded
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Create a new schema, import an existing one, or load a saved schema to get started
                </p>
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Button onClick={handleNewSchema}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    New Schema
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportModal(true)}>
                    <Upload className="w-4 h-4 mr-1.5" />
                    Import Schema
                  </Button>
                </div>

                {/* Saved Schemas List */}
                {savedSchemas.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Saved Schemas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {savedSchemas.map((schema) => (
                        <div
                          key={schema.id}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
                          onClick={() => handleLoadSchema(schema)}
                        >
                          <h5 className="font-semibold text-gray-900 dark:text-white mb-1">{schema.name}</h5>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {schema.tables?.length || 0} tables • {schema.databaseType}
                          </p>
                          {schema.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {schema.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Schema Overview */}
        {currentSchema && currentSchema.tables && currentSchema.tables.length > 0 && (
          <div
            className={`bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300 ${
              sidebarCollapsed ? 'w-0' : 'w-80'
            } flex relative`}
          >
            {/* Collapse Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute left-0 top-20 transform -translate-x-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-l-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-lg z-20"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {!sidebarCollapsed && (
              <>
                {/* Sidebar Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Schema Overview</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {schemaName || 'Untitled Schema'}
                  </p>
                </div>

                {/* Tables List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {currentSchema.tables.map((table, idx) => {
                    const primaryKeys = table.columns.filter((c) => c.primaryKey).length;
                    const foreignKeys = table.columns.filter((c) => c.references).length;
                    const colorIndex = idx % 10;
                    const colors = [
                      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
                      'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
                      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
                      'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                      'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                    ];

                    return (
                      <div
                        key={table.name}
                        className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${colors[colorIndex]}`} />
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {table.name}
                          </h4>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
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

                {/* Schema Stats */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Statistics</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-center">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {currentSchema.tables.length}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Tables</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {currentSchema.tables.reduce((acc, t) => acc + t.columns.length, 0)}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Columns</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2 text-center">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {currentSchema.relationships?.length || 0}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Relations</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2 text-center">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {currentSchema.tables.reduce((acc, t) => acc + (t.indexes?.length || 0), 0)}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Indexes</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Schema</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Upload a JSON or SQL file to import
              </p>
            </div>

            <div className="p-6">
              <SchemaUploader
                onSchemaUpload={handleSchemaUpload}
                onOptimize={() => {}}
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
