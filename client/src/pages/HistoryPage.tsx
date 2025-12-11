import React, { useState, useEffect } from 'react';
import { Card, Button, CodeBlock, Tabs, Loading, Modal, ConfirmModal } from '../components/common';
import { useAppStore, useNotificationStore, useVisualQueryStore } from '../stores';
import { historyService, SchemaHistoryEntry, QueryHistoryEntry, CodeGenerationHistoryEntry, HistoryStats, parseSQLToVisualQuery } from '../services';
import { formatDate } from '../lib/utils';
import { Database, Search, Trash2, Clock, CheckCircle, XCircle, RefreshCw, FileCode, Table as TableIcon, AlertTriangle, Code2, GitBranch, ChevronDown } from 'lucide-react';

type HistoryTab = 'schemas' | 'queries' | 'code';

interface DeleteConfirmation {
  type: 'schema' | 'query' | 'code';
  id: number;
  title: string;
  cascadeCount?: number;
}

export const HistoryPage: React.FC = () => {
  const { 
    setCurrentSchema, 
    setGeneratedSql, 
    setActivePage, 
    setSelectedDatabase,
    setSchemaDescription,
    setNaturalLanguageInput,
    setGeneratedQuery,
    setQueryAnalysis,
    currentSchema,
    loadSchemaFromHistory,
    setPendingSchemaChange,
    setPendingTemplateData,
  } = useAppStore();
  const { addNotification } = useNotificationStore();
  const { loadQuery: loadVisualQuery, resetQuery } = useVisualQueryStore();
  
  const [activeTab, setActiveTab] = useState<HistoryTab>('schemas');
  const [schemaHistory, setSchemaHistory] = useState<SchemaHistoryEntry[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>([]);
  const [codeHistory, setCodeHistory] = useState<CodeGenerationHistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [queryMenuOpen, setQueryMenuOpen] = useState<number | null>(null);
  const [isParsingSQL, setIsParsingSQL] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [schemas, queries, codeGens, historyStats] = await Promise.all([
        historyService.getSchemaHistory(50, 0),
        historyService.getQueryHistory(50, 0),
        historyService.getCodeGenerationHistory(50, 0),
        historyService.getStats(),
      ]);
      setSchemaHistory(schemas);
      setQueryHistory(queries);
      setCodeHistory(codeGens);
      setStats(historyStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
      console.error('Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (queryMenuOpen !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setQueryMenuOpen(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [queryMenuOpen]);

  const handleDeleteSchema = (entry: SchemaHistoryEntry) => {
    // Count how many queries might be affected (queries that use this schema)
    const relatedQueries = queryHistory.filter(q => 
      q.schemaContext?.includes(entry.description.substring(0, 50))
    ).length;
    
    setDeleteConfirmation({
      type: 'schema',
      id: entry.id,
      title: entry.description.substring(0, 50) + (entry.description.length > 50 ? '...' : ''),
      cascadeCount: relatedQueries,
    });
  };

  const handleDeleteQuery = (entry: QueryHistoryEntry) => {
    setDeleteConfirmation({
      type: 'query',
      id: entry.id,
      title: entry.naturalLanguage.substring(0, 50) + (entry.naturalLanguage.length > 50 ? '...' : ''),
    });
  };

  const handleDeleteCode = (entry: CodeGenerationHistoryEntry) => {
    setDeleteConfirmation({
      type: 'code',
      id: entry.id,
      title: entry.description.substring(0, 50) + (entry.description.length > 50 ? '...' : ''),
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setIsDeleting(true);
    try {
      if (deleteConfirmation.type === 'schema') {
        const result = await historyService.deleteSchema(deleteConfirmation.id);
        console.log(`Schema deleted. Related queries deleted: ${result.queriesDeleted}`);
      } else if (deleteConfirmation.type === 'query') {
        await historyService.deleteQuery(deleteConfirmation.id);
      } else if (deleteConfirmation.type === 'code') {
        await historyService.deleteCodeGeneration(deleteConfirmation.id);
      }
      // Refresh the list
      await loadHistory();
      setDeleteConfirmation(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setShowClearAllConfirm(true);
  };

  const executeClearAll = async () => {
    setShowClearAllConfirm(false);
    setIsLoading(true);
    try {
      await historyService.clearAllHistory();
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to clear history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadHistory();
      return;
    }
    
    setIsLoading(true);
    try {
      const searchType = activeTab === 'schemas' ? 'schema' : activeTab === 'queries' ? 'query' : 'code';
      const results = await historyService.search(searchQuery, searchType);
      if (activeTab === 'schemas') {
        setSchemaHistory(results as SchemaHistoryEntry[]);
      } else if (activeTab === 'queries') {
        setQueryHistory(results as QueryHistoryEntry[]);
      } else {
        setCodeHistory(results as CodeGenerationHistoryEntry[]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSchema = async (entry: SchemaHistoryEntry) => {
    try {
      // Parse the schema to get its name and data
      const schema = entry.schemaJson ? JSON.parse(entry.schemaJson) : null;
      
      if (!schema) {
        addNotification({
          type: 'error',
          title: 'Invalid Schema',
          message: 'Failed to parse schema data',
        });
        return;
      }
      
      // Check if there's already a schema loaded - show confirmation modal
      if (currentSchema && currentSchema.tables && currentSchema.tables.length > 0) {
        // Use the appStore's pending schema change mechanism
        setPendingSchemaChange({
          schema,
          schemaId: entry.id,
          generatedSql: entry.sqlDefinition || undefined,
          databaseType: (entry.databaseType || 'postgresql') as any,
          description: entry.description,
          source: 'history',
        });
        return;
      }
      
      // No existing schema, load directly using the store action
      await loadSchemaFromHistory(entry.id);
      setActivePage('schema');
      
      addNotification({
        type: 'success',
        title: 'Schema Loaded',
        message: `Schema "${schema.name || entry.description.substring(0, 40)}" loaded successfully`,
      });
    } catch (err: any) {
      console.error('Error loading schema:', err);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: err.message || 'Failed to load schema',
      });
    }
  };

  const handleUseQuery = (entry: QueryHistoryEntry) => {
    // Check if schema is loaded
    if (!currentSchema || !currentSchema.tables || currentSchema.tables.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Schema Required',
        message: 'Please load a schema first. Queries require a schema context to work properly.',
      });
      return;
    }
    
    // Set the original natural language input so user sees what prompt was used
    setNaturalLanguageInput(entry.naturalLanguage);
    // Set the generated query results
    setGeneratedQuery({
      sql: entry.sqlQuery,
      explanation: entry.explanation || '',
      queryType: 'select',
      tables: [],
      estimatedComplexity: 'moderate',
    });
    // Clear previous analysis (will be re-analyzed if needed)
    setQueryAnalysis(null);
    setSelectedDatabase(entry.databaseType as any);
    // Navigate to query page
    setActivePage('query');
    setQueryMenuOpen(null);
  };

  const handleUseVisualQuery = async (entry: QueryHistoryEntry) => {
    setQueryMenuOpen(null);
    
    // Check if schema is loaded
    if (!currentSchema || !currentSchema.tables || currentSchema.tables.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Schema Required',
        message: 'Please load a schema first before using Visual Query Designer. The schema provides table and column information needed for visual query building.',
      });
      return;
    }

    setIsParsingSQL(true);
    
    try {
      // Parse the SQL query into visual query format
      const result = await parseSQLToVisualQuery({
        sql: entry.sqlQuery,
        schemaContext: currentSchema.tables,
      });

      if (result.success && result.data) {
        // Reset current query and load the parsed one
        resetQuery();
        loadVisualQuery({
          ...result.data,
          name: entry.naturalLanguage.substring(0, 50) + (entry.naturalLanguage.length > 50 ? '...' : ''),
          description: entry.explanation || '',
        });
        
        setSelectedDatabase(entry.databaseType as any);
        setActivePage('visual-query-builder');
        
        addNotification({
          type: 'success',
          title: 'Query Loaded',
          message: 'Query successfully loaded into Visual Query Designer',
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Parse Failed',
          message: result.error?.message || 'Failed to parse SQL query for visual designer',
        });
      }
    } catch (err: any) {
      console.error('Error parsing SQL for visual query:', err);
      addNotification({
        type: 'error',
        title: 'Parse Error',
        message: err.message || 'An error occurred while parsing the SQL query',
      });
    } finally {
      setIsParsingSQL(false);
    }
  };

  const tabs = [
    { id: 'schemas' as HistoryTab, label: `Schemas (${schemaHistory.length})`, icon: <TableIcon className="w-4 h-4" /> },
    { id: 'queries' as HistoryTab, label: `Queries (${queryHistory.length})`, icon: <FileCode className="w-4 h-4" /> },
    { id: 'code' as HistoryTab, label: `Templates (${codeHistory.length})`, icon: <Code2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and reuse your previously generated schemas and queries
          </p>
        </div>
        <div className="flex gap-2">
          {(schemaHistory.length > 0 || queryHistory.length > 0) && (
            <Button variant="danger" size="sm" onClick={handleClearAll} disabled={isLoading}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={loadHistory} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.schemaCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schemas Generated</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileCode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.queryCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Queries Generated</p>
              </div>
            </div>
          </Card>
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.successRate}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as HistoryTab)}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" />
        </div>
      ) : activeTab === 'schemas' ? (
        /* Schema History */
        schemaHistory.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No schema history yet</p>
              <p className="text-sm mt-2">Your generated schemas will appear here</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {schemaHistory.map((entry) => (
              <Card key={entry.id}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === 'success' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {entry.status === 'success' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {entry.status}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {entry.databaseType}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                          {entry.tableCount} tables
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(entry.createdAt)} • {(entry.processingTime / 1000).toFixed(1)}s
                      </p>
                    </div>
                    {entry.status === 'success' && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUseSchema(entry)}
                        >
                          Use Schema
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteSchema(entry)}
                          title="Delete schema"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {entry.status !== 'success' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteSchema(entry)}
                        title="Delete schema"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
                    <p className="text-gray-900 dark:text-white text-sm line-clamp-3">{entry.description}</p>
                  </div>

                  {/* SQL Preview */}
                  {entry.status === 'success' && entry.sqlOutput && (
                    <CodeBlock
                      code={entry.sqlOutput.substring(0, 500) + (entry.sqlOutput.length > 500 ? '\n-- ... truncated ...' : '')}
                      language="sql"
                      title="SQL Preview"
                      maxHeight="150px"
                    />
                  )}

                  {/* Error Message */}
                  {entry.status === 'error' && entry.errorMessage && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-400">{entry.errorMessage}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : activeTab === 'queries' ? (
        /* Query History */
        queryHistory.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No query history yet</p>
              <p className="text-sm mt-2">Your generated queries will appear here</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {queryHistory.map((entry) => (
              <Card key={entry.id}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.status === 'success' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {entry.status === 'success' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {entry.status}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {entry.databaseType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(entry.createdAt)} • {(entry.processingTime / 1000).toFixed(1)}s
                      </p>
                    </div>
                    {entry.status === 'success' && (
                      <div className="flex gap-2">
                        {/* Use Query Dropdown */}
                        <div className="relative">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setQueryMenuOpen(queryMenuOpen === entry.id ? null : entry.id)}
                            disabled={isParsingSQL}
                          >
                            {isParsingSQL && queryMenuOpen === entry.id ? (
                              <>
                                <span className="animate-spin mr-1.5">⟳</span>
                                Parsing...
                              </>
                            ) : (
                              <>
                                Use Query
                                <ChevronDown className="w-4 h-4 ml-1.5" />
                              </>
                            )}
                          </Button>
                          {queryMenuOpen === entry.id && !isParsingSQL && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                              <button
                                onClick={() => handleUseQuery(entry)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <FileCode className="w-4 h-4" />
                                Query Builder
                              </button>
                              <button
                                onClick={() => handleUseVisualQuery(entry)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <GitBranch className="w-4 h-4" />
                                Visual Designer
                              </button>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteQuery(entry)}
                          title="Delete query"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {entry.status !== 'success' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteQuery(entry)}
                        title="Delete query"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Natural Language */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Natural Language</p>
                    <p className="text-gray-900 dark:text-white">{entry.naturalLanguage}</p>
                  </div>

                  {/* SQL Query */}
                  {entry.status === 'success' && entry.sqlQuery && (
                    <CodeBlock
                      code={entry.sqlQuery}
                      language="sql"
                      title="Generated SQL"
                      maxHeight="200px"
                    />
                  )}

                  {/* Explanation */}
                  {entry.explanation && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Explanation</p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">{entry.explanation}</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {entry.status === 'error' && entry.errorMessage && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-700 dark:text-red-400">{entry.errorMessage}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Code Generation History */
        codeHistory.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Code2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No template generation history yet</p>
              <p className="text-sm mt-2">Your generated project templates will appear here</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {codeHistory.map((entry) => {
              const files = entry.filesJson ? JSON.parse(entry.filesJson) : [];
              
              return (
                <Card key={entry.id}>
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === 'success' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                            {entry.status === 'success' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                            {entry.status}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                            {entry.language}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {entry.framework}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.fileCount} files
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(entry.createdAt)} • {(entry.processingTime / 1000).toFixed(1)}s
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {entry.status === 'success' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              // Parse and load the generated files
                              try {
                                const files = JSON.parse(entry.filesJson);
                                const schema = entry.schemaJson ? JSON.parse(entry.schemaJson) : null;
                                
                                // Set the schema if available
                                if (schema) {
                                  setCurrentSchema(schema);
                                }
                                
                                // Store the code generation data in app store for CodePage to pick up
                                setPendingTemplateData({
                                  files,
                                  language: entry.language,
                                  framework: entry.framework,
                                  description: entry.description,
                                });
                                
                                // Navigate to code page
                                setActivePage('code');
                                
                                addNotification({
                                  type: 'success',
                                  title: 'Template Loaded',
                                  message: `Loaded ${files.length} files from template`,
                                });
                              } catch (error) {
                                console.error('Failed to load template:', error);
                                addNotification({
                                  type: 'error',
                                  title: 'Load Failed',
                                  message: 'Failed to load template data',
                                });
                              }
                            }}
                          >
                            View Template
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteCode(entry)}
                          title="Delete template generation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
                      <p className="text-gray-900 dark:text-white text-sm">{entry.description}</p>
                    </div>

                    {/* Files Preview */}
                    {entry.status === 'success' && files.length > 0 && (
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Generated Files</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {files.slice(0, 20).map((file: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 p-2 bg-white dark:bg-gray-700 rounded">
                              <FileCode className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate" title={file.path}>
                                {file.path}
                              </span>
                            </div>
                          ))}
                          {files.length > 20 && (
                            <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                              ... and {files.length - 20} more files
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {entry.status === 'error' && entry.errorMessage && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-400">{entry.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title={`Delete ${deleteConfirmation?.type === 'schema' ? 'Schema' : deleteConfirmation?.type === 'query' ? 'Query' : 'Template Generation'}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium">
                Are you sure you want to delete this {deleteConfirmation?.type}?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                "{deleteConfirmation?.title}"
              </p>
              {deleteConfirmation?.type === 'schema' && deleteConfirmation.cascadeCount !== undefined && deleteConfirmation.cascadeCount > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Warning:</strong> This will also delete approximately {deleteConfirmation.cascadeCount} related {deleteConfirmation.cascadeCount === 1 ? 'query' : 'queries'} that use this schema.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmation(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={executeClearAll}
        title="Clear All History"
        message="Are you sure you want to clear ALL history? This will permanently delete all schemas, queries, and code generation records. This action cannot be undone."
        variant="danger"
        confirmText="Clear All History"
      />
    </div>
  );
};
