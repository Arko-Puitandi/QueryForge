import React, { useState } from 'react';
import { QueryCanvas, FilterPanel, PreviewPanel, JoinEditor, AdvancedOptions, AIQueryAssistant, SQLImporter, AdvancedSQLFeatures, SQLVisualizerInput } from '../components/query';
import { Button, Input, ConfirmModal } from '../components/common';
import { useVisualQueryStore } from '../stores';
import { useAppStore } from '../stores';
import { Save, Trash2, Database, Filter, Code, Link, Sliders, Bot, FileUp, FileDown, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '../stores';

export const VisualQueryBuilderPage: React.FC = () => {
  const {
    currentQuery,
    setQueryName,
    addTable,
    removeTable,
    updateTablePosition,
    addJoin,
    removeJoin,
    updateJoin,
    toggleColumnSelection,
    setFilters,
    setGroupBy,
    setDistinct,
    setLimit,
    saveQuery,
    resetQuery,
  } = useVisualQueryStore();

  const { currentSchema, setActivePage } = useAppStore();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'tables' | 'joins' | 'filters' | 'advanced' | 'preview' | 'ai' | 'import' | 'export'>('tables');
  const [isSaving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Get selected columns per table
  const selectedColumnsByTable = currentQuery.tables.reduce((acc, table) => {
    const tableColumns = currentQuery.selectedColumns
      .filter(col => col.tableId === table.id)
      .map(col => col.columnName);
    acc[table.id] = tableColumns;
    return acc;
  }, {} as Record<string, string[]>);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save to Zustand store
      saveQuery();

      // Save to backend
      // await api.saveVisualQuery({
      //   visualQuery: currentQuery,
      //   databaseType,
      // });

      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Visual query saved successfully',
      });
    } catch (error) {
      console.error('Save error:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save visual query',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const executeReset = () => {
    resetQuery();
    addNotification({
      type: 'info',
      title: 'Info',
      message: 'Query reset successfully',
    });
    setShowResetConfirm(false);
  };

  // Validate schema is loaded
  if (!currentSchema || !currentSchema.tables || currentSchema.tables.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No Schema Loaded
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The Visual Query Designer requires a schema to work with. Please load or create a schema first to build queries against your database tables.
          </p>
          <Button 
            variant="primary"
            onClick={() => setActivePage('schema')}
          >
            <Database className="w-4 h-4 mr-2" />
            Go to Schema Builder
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Compact Top Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Query Name - Compact */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <Input
                value={currentQuery.name}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="Untitled Query"
                className="text-sm font-semibold border-0 bg-transparent focus:bg-gray-50 dark:focus:bg-gray-700 px-2"
              />
            </div>

            {/* Stats - Compact */}
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-900 dark:text-white">{currentQuery.tables.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-900 dark:text-white">{currentQuery.joins.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-900 dark:text-white">{currentQuery.selectedColumns.length}</span>
              </div>
            </div>

            {/* Quick Options */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={currentQuery.distinct || false}
                  onChange={(e) => setDistinct(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 w-3.5 h-3.5"
                />
                <span>DISTINCT</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-600 dark:text-gray-400">LIMIT</span>
                <Input
                  type="number"
                  value={currentQuery.limit || ''}
                  onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="∞"
                  className="w-16 text-xs h-7"
                  min="0"
                />
              </div>
            </div>

            {/* Actions - Compact */}
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} variant="primary" size="sm" disabled={isSaving}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Saving...' : 'Save'}
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
            onClick={() => setActiveTab('tables')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all group ${
              activeTab === 'tables'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Tables & Columns"
          >
            <Database className="w-5 h-5" />
            {currentQuery.tables.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {currentQuery.tables.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('joins')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'joins'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Table Joins"
          >
            <Link className="w-5 h-5" />
            {currentQuery.joins.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {currentQuery.joins.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'filters'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Filters (WHERE)"
          >
            <Filter className="w-5 h-5" />
            {(currentQuery.filters?.conditions.length || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {currentQuery.filters?.conditions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('advanced')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'advanced'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Advanced Options"
          >
            <Sliders className="w-5 h-5" />
          </button>

          <div className="h-px bg-gray-300 dark:bg-gray-600 w-8 my-2" />

          <button
            onClick={() => setActiveTab('ai')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'ai'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="AI Assistant"
          >
            <Bot className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'import'
                ? 'bg-green-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="Import SQL"
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
            title="Export SQL"
          >
            <FileDown className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setActiveTab('preview')}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title="SQL Preview"
          >
            <Code className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area - Maximum Space for Canvas */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* SQL Visualizer - Always visible at top */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="p-4">
              <SQLVisualizerInput
                onVisualize={(query) => {
                  const state = useVisualQueryStore.getState();
                  useVisualQueryStore.setState({
                    currentQuery: {
                      ...state.currentQuery,
                      ...query,
                    },
                  });
                  addNotification({
                    type: 'success',
                    title: 'Success',
                    message: 'SQL query visualized successfully',
                  });
                  setActiveTab('preview'); // Show preview after visualization
                }}
              />
            </div>
          </div>

          {activeTab === 'tables' && (
            <div className="flex-1 h-full">
              <QueryCanvas
                tables={currentQuery.tables}
                joins={currentQuery.joins}
                schemaContext={currentSchema.tables}
                selectedColumns={selectedColumnsByTable}
                onTableAdd={addTable}
                onTableRemove={removeTable}
                onTablePositionChange={updateTablePosition}
                onJoinAdd={addJoin}
                onJoinRemove={removeJoin}
                onColumnToggle={toggleColumnSelection}
              />
            </div>
          )}

          {activeTab === 'joins' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-5xl mx-auto">
                <JoinEditor
                  joins={currentQuery.joins}
                  tables={currentQuery.tables}
                  schemaContext={currentSchema.tables}
                  onJoinAdd={addJoin}
                  onJoinUpdate={updateJoin}
                  onJoinRemove={removeJoin}
                />
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-5xl mx-auto">
                <FilterPanel
                  filters={currentQuery.filters!}
                  tables={currentQuery.tables}
                  schemaContext={currentSchema.tables}
                  onFiltersChange={setFilters}
                />
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-5xl mx-auto">
                <AdvancedOptions
                  tables={currentQuery.tables}
                  schemaContext={currentSchema.tables}
                  groupBy={currentQuery.groupBy ? {
                    columns: currentQuery.groupBy.columns.map(c => `${c.tableId}.${c.columnName}`),
                    having: currentQuery.groupBy.having,
                  } : undefined}
                  orderBy={currentQuery.orderBy?.map(o => ({
                    column: `${o.tableId}.${o.columnName}`,
                    direction: o.direction as 'ASC' | 'DESC',
                  }))}
                  onGroupByChange={(groupBy) => {
                    if (!groupBy) {
                      setGroupBy(undefined);
                      return;
                    }
                    setGroupBy({
                      columns: groupBy.columns.map(col => {
                        const [tableId, columnName] = col.split('.');
                        return { tableId, columnName };
                      }),
                      having: groupBy.having,
                    });
                  }}
                  onOrderByChange={(orderBy) => {
                    const state = useVisualQueryStore.getState();
                    useVisualQueryStore.setState({
                      currentQuery: {
                        ...state.currentQuery,
                        orderBy: orderBy.map(o => {
                          const [tableId, columnName] = o.column.split('.');
                          return { tableId, columnName, direction: o.direction as 'ASC' | 'DESC' };
                        }),
                      },
                    });
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-6xl mx-auto">
                <PreviewPanel
                  visualQuery={currentQuery}
                />
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-5xl mx-auto">
                <AIQueryAssistant
                  currentQuery={currentQuery}
                  onQueryGenerate={(query) => {
                    // Merge the generated query with current query
                    const state = useVisualQueryStore.getState();
                    useVisualQueryStore.setState({
                      currentQuery: {
                        ...state.currentQuery,
                        ...query,
                      },
                    });
                    addNotification({
                      type: 'success',
                      title: 'Success',
                      message: 'AI-generated query applied successfully',
                    });
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-5xl mx-auto">
                <SQLImporter
                  onQueryImport={(query) => {
                    const state = useVisualQueryStore.getState();
                    useVisualQueryStore.setState({
                      currentQuery: {
                        ...state.currentQuery,
                        ...query,
                      },
                    });
                    addNotification({
                      type: 'success',
                      title: 'Success',
                      message: 'SQL query imported successfully',
                    });
                    setActiveTab('preview'); // Show preview after import
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-6xl mx-auto">
                <AdvancedSQLFeatures
                  visualQuery={currentQuery}
                  databaseType="postgresql"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={executeReset}
        title="Reset Query"
        message="Are you sure you want to reset the query? All tables, joins, filters, and settings will be cleared. This action cannot be undone."
        variant="warning"
        confirmText="Reset Query"
      />
    </div>
  );
};
