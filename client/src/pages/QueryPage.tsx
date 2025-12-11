import React, { useState, useEffect } from 'react';
import { Button, Card, Textarea, CodeBlock, Loading, Tabs, Select } from '../components/common';
import { VoiceInput } from '../components/voice';
import { useQuery } from '../hooks';
import { useAppStore } from '../stores';
import { useNotificationStore } from '../stores';
import { CRUDOperation } from '../types';
import { Mic, Keyboard, RotateCcw, Plus, Filter, ArrowUpDown, Columns } from 'lucide-react';
import { updateQueryInHistory } from '../services/api';

export const QueryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('natural');
  const [selectedTable, setSelectedTable] = useState('');
  const [crudOperation, setCrudOperation] = useState<CRUDOperation>('read');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  
  // Manual query optimization
  const [manualQuery, setManualQuery] = useState('');
  
  // Enhanced CRUD options
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereClause, setWhereClause] = useState('');
  const [orderByColumn, setOrderByColumn] = useState('');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [limitValue, setLimitValue] = useState('');
  const [includeJoins, setIncludeJoins] = useState(false);

  const {
    generatedQuery,
    queryAnalysis,
    optimizedQuery,
    isLoading,
    error,
    generateQuery,
    generateCRUD,
    analyzeQuery,
    optimizeQuery,
    explainQuery,
  } = useQuery();

  const { currentSchema, naturalLanguageInput, setNaturalLanguageInput, resetQuery, isGeneratingQuery, isAnalyzingQuery, isOptimizingQuery, isExplainingQuery, setGeneratedQuery } = useAppStore();
  const { addNotification } = useNotificationStore();

  // Use current schema only
  const activeSchema = currentSchema;

  // Reset selected table when schema changes
  useEffect(() => {
    setSelectedTable('');
    setSelectedColumns([]);
    setWhereClause('');
    setOrderByColumn('');
  }, [currentSchema]);

  // Get columns for selected table
  const getTableColumns = () => {
    if (!activeSchema || !selectedTable) return [];
    const table = activeSchema.tables?.find(t => t.name === selectedTable);
    return table?.columns || [];
  };

  const tableColumns = getTableColumns();

  const handleGenerateQuery = async () => {
    if (!naturalLanguageInput.trim()) return;
    await generateQuery(naturalLanguageInput);
  };

  const handleGenerateCRUD = async () => {
    if (!selectedTable || !activeSchema) return;
    
    // TODO: Enhanced options for future CRUD generation
    // const options = {
    //   columns: selectedColumns.length > 0 ? selectedColumns : undefined,
    //   where: whereClause || undefined,
    //   orderBy: orderByColumn ? { column: orderByColumn, direction: orderDirection } : undefined,
    //   limit: limitValue ? parseInt(limitValue) : undefined,
    //   includeJoins,
    // };
    
    await generateCRUD(selectedTable, crudOperation, activeSchema);
  };

  // Toggle column selection
  const toggleColumn = (columnName: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnName) 
        ? prev.filter(c => c !== columnName)
        : [...prev, columnName]
    );
  };

  // Select all columns
  const selectAllColumns = () => {
    setSelectedColumns(tableColumns.map(c => c.name));
  };

  // Clear column selection
  const clearColumnSelection = () => {
    setSelectedColumns([]);
  };

  const handleAnalyze = async () => {
    if (!generatedQuery?.sql) {
      return;
    }
    if (!currentSchema) {
      return;
    }
    await analyzeQuery(generatedQuery.sql);
  };

  const tabs = [
    { id: 'natural', label: 'Natural Language', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
    { id: 'crud', label: 'CRUD Operations', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg> },
    { id: 'optimize', label: 'Optimize Query', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
  ];

  const crudOptions = [
    { value: 'create', label: 'INSERT (Create)' },
    { value: 'read', label: 'SELECT (Read)' },
    { value: 'update', label: 'UPDATE' },
    { value: 'delete', label: 'DELETE' },
  ];

  const tableOptions = activeSchema?.tables?.map((t) => ({
    value: t.name,
    label: `${t.name} (${t.columns?.length || 0} cols)`,
  })) || [];

  const exampleQueries = [
    'Get all users who registered in the last 30 days',
    'Find top 10 products by total sales amount',
    'List orders with their items and customer details',
    'Calculate average order value per customer',
    'Get monthly revenue trends for the past year',
    'Find users who have never made a purchase',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Query Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Generate SQL queries from natural language with AI-powered performance analysis
        </p>
      </div>

      {!currentSchema && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              No schema loaded. Please generate a schema first for better query generation.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card title="Query Input" noPadding>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-6" />
          
          <div className="p-6">
            {activeTab === 'natural' ? (
              <div className="space-y-4">
                {/* Input Mode Toggle */}
                <div className="flex items-center gap-2 pb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Input Mode:</span>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setInputMode('text')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                        inputMode === 'text'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Keyboard className="w-4 h-4" />
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('voice')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                        inputMode === 'voice'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      Voice
                    </button>
                  </div>
                </div>

                {inputMode === 'text' ? (
                  <Textarea
                    label="Describe what you want to query"
                    placeholder="e.g., Get all users who have made more than 5 orders in the last month..."
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    rows={6}
                  />
                ) : (
                  <VoiceInput
                    onTranscript={(text) => setNaturalLanguageInput(text)}
                    placeholder="Click the microphone and describe your query..."
                  />
                )}

                {/* Show current query when in voice mode */}
                {inputMode === 'voice' && naturalLanguageInput && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                      Current Query Description:
                    </label>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{naturalLanguageInput}</p>
                    <button
                      type="button"
                      onClick={() => setNaturalLanguageInput('')}
                      className="mt-2 text-xs text-red-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateQuery}
                    isLoading={isGeneratingQuery}
                    disabled={!naturalLanguageInput.trim()}
                    className="flex-1"
                  >
                    Generate Query
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={resetQuery}
                    disabled={isLoading}
                    title="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : activeTab === 'crud' ? (
              <div className="space-y-4">
                {/* Table Selection */}
                <Select
                  label="Select Table"
                  options={tableOptions}
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  placeholder="Choose a table..."
                  disabled={!activeSchema || tableOptions.length === 0}
                />

                {/* Operation Type */}
                <Select
                  label="Operation"
                  options={crudOptions}
                  value={crudOperation}
                  onChange={(e) => setCrudOperation(e.target.value as CRUDOperation)}
                />

                {/* Column Selection (for SELECT operations) */}
                {selectedTable && crudOperation === 'read' && tableColumns.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Columns className="w-4 h-4" />
                        Select Columns
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllColumns}
                          className="text-xs text-blue-500 hover:text-blue-600"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={clearColumnSelection}
                          className="text-xs text-gray-500 hover:text-gray-600"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="grid grid-cols-2 gap-1">
                        {tableColumns.map((col) => (
                          <label
                            key={col.name}
                            className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedColumns.includes(col.name)}
                              onChange={() => toggleColumn(col.name)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate" title={`${col.name} (${col.type})`}>
                              {col.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {selectedColumns.length > 0 && (
                      <p className="text-xs text-gray-500">{selectedColumns.length} columns selected</p>
                    )}
                  </div>
                )}

                {/* WHERE Clause */}
                {selectedTable && (crudOperation === 'read' || crudOperation === 'update' || crudOperation === 'delete') && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Filter className="w-4 h-4" />
                      WHERE Condition (optional)
                    </label>
                    <input
                      type="text"
                      value={whereClause}
                      onChange={(e) => setWhereClause(e.target.value)}
                      placeholder="e.g., status = 'active' AND created_at > '2024-01-01'"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* ORDER BY (for SELECT) */}
                {selectedTable && crudOperation === 'read' && tableColumns.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <ArrowUpDown className="w-4 h-4" />
                        Order By
                      </label>
                      <select
                        value={orderByColumn}
                        onChange={(e) => setOrderByColumn(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {tableColumns.map((col) => (
                          <option key={col.name} value={col.name}>{col.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Direction</label>
                      <select
                        value={orderDirection}
                        onChange={(e) => setOrderDirection(e.target.value as 'ASC' | 'DESC')}
                        disabled={!orderByColumn}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="ASC">Ascending</option>
                        <option value="DESC">Descending</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* LIMIT (for SELECT) */}
                {selectedTable && crudOperation === 'read' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Limit Results</label>
                    <input
                      type="number"
                      value={limitValue}
                      onChange={(e) => setLimitValue(e.target.value)}
                      placeholder="e.g., 100"
                      min="1"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Include Joins Toggle */}
                {selectedTable && crudOperation === 'read' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeJoins}
                      onChange={(e) => setIncludeJoins(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include related table JOINs</span>
                  </label>
                )}

                <Button
                  onClick={handleGenerateCRUD}
                  isLoading={isLoading}
                  disabled={!selectedTable || !activeSchema}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate {crudOperation.toUpperCase()} Query
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Optimize Query Tab */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800">
                  <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI-Powered Query Optimization
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Paste your SQL query below and get AI-powered optimization suggestions with performance improvements.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    SQL Query to Optimize
                  </label>
                  <Textarea
                    placeholder="Paste your SQL query here... e.g., SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter any SQL query (SELECT, INSERT, UPDATE, DELETE, etc.) for optimization analysis
                  </p>
                </div>

                {!currentSchema && (
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Load a schema for context-aware optimization recommendations including index suggestions.</span>
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => optimizeQuery(manualQuery)}
                    isLoading={isLoading}
                    disabled={!manualQuery.trim()}
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Optimize Query
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setManualQuery('')}
                    disabled={!manualQuery || isLoading}
                    title="Clear"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick action: Optimize generated query */}
                {generatedQuery && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setManualQuery(generatedQuery.sql);
                        optimizeQuery(generatedQuery.sql);
                      }}
                      className="w-full"
                    >
                      Optimize Previously Generated Query
                    </Button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Output Section */}
        <Card title="Generated Query" className="h-fit">
          {isGeneratingQuery ? (
            <Loading size="lg" text="Generating query with AI..." />
          ) : generatedQuery ? (
            <div className="space-y-4">
              <CodeBlock
                code={generatedQuery.sql}
                language="sql"
                title={`SQL Query (${generatedQuery.sql.split('\n').length} lines)`}
                maxHeight="500px"
                showDownload
                filename="query.sql"
              />
              
              {generatedQuery.explanation && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Explanation</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{generatedQuery.explanation}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleAnalyze}
                  isLoading={isAnalyzingQuery}
                  disabled={isAnalyzingQuery}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {isAnalyzingQuery ? 'Analyzing...' : 'Analyze Performance'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => optimizeQuery(generatedQuery.sql)}
                  isLoading={isOptimizingQuery}
                  disabled={isOptimizingQuery}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isOptimizingQuery ? 'Optimizing...' : 'Optimize'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => explainQuery(generatedQuery.sql)}
                  isLoading={isExplainingQuery}
                  disabled={isExplainingQuery}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isExplainingQuery ? 'Explaining...' : 'Explain'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Your generated query will appear here</p>
            </div>
          )}
        </Card>
      </div>

      {/* Query Analysis */}
      {queryAnalysis && (
        <Card title="Performance Analysis">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Performance Score */}
            <div className="text-center p-6 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className={`text-4xl font-bold mb-2 ${
                queryAnalysis.performanceScore >= 70 ? 'text-green-500' :
                queryAnalysis.performanceScore >= 40 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {queryAnalysis.performanceScore}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Performance Score</p>
            </div>

            {/* Complexity */}
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 capitalize">
                {queryAnalysis.complexityLevel}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Query Complexity</p>
            </div>

            {/* Estimated Time */}
            <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {queryAnalysis.estimatedExecutionTime || 'N/A'}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Time</p>
            </div>
          </div>

          {/* Issues & Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {queryAnalysis.potentialIssues && queryAnalysis.potentialIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Issues Found</h4>
                <ul className="space-y-2">
                  {queryAnalysis.potentialIssues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {queryAnalysis.suggestions && queryAnalysis.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Suggestions</h4>
                <ul className="space-y-2">
                  {queryAnalysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {suggestion.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {queryAnalysis.summary && (
            <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">{queryAnalysis.summary}</p>
            </div>
          )}
        </Card>
      )}

      {/* Query Optimization Results */}
      {optimizedQuery && (
        <Card title="Optimization Results" className="border-2 border-green-200 dark:border-green-800">
          <div className="space-y-6">
            {/* Optimized SQL */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Optimized Query
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                    {optimizedQuery.optimizations?.length || 0} Improvements
                  </span>
                  {generatedQuery && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!generatedQuery || !optimizedQuery) return;
                        try {
                          console.log('[QueryPage] Replace Original clicked');
                          console.log('[QueryPage] Generated Query historyId:', generatedQuery.historyId);
                          console.log('[QueryPage] Optimized SQL:', optimizedQuery.optimizedSql.substring(0, 100));
                          
                          // Update in store
                          setGeneratedQuery({ ...generatedQuery, sql: optimizedQuery.optimizedSql });
                          
                          // Also update current query for manual editing
                          setManualQuery(optimizedQuery.optimizedSql);
                          
                          // Update in database if we have a history ID
                          if (generatedQuery.historyId) {
                            console.log('[QueryPage] Calling updateQueryInHistory API...');
                            const response = await updateQueryInHistory(generatedQuery.historyId, optimizedQuery.optimizedSql);
                            console.log('[QueryPage] API Response:', response);
                            
                            addNotification({
                              type: 'success',
                              title: 'Query Replaced',
                              message: 'Original query replaced and updated in history',
                            });
                          } else {
                            console.log('[QueryPage] No historyId found, skipping database update');
                            addNotification({
                              type: 'success',
                              title: 'Query Replaced',
                              message: 'Original query replaced (not saved to history)',
                            });
                          }
                        } catch (error: any) {
                          console.error('[QueryPage] Failed to replace query:', error);
                          console.error('[QueryPage] Error details:', error.response?.data);
                          addNotification({
                            type: 'error',
                            title: 'Replace Failed',
                            message: error.response?.data?.error?.message || 'Failed to replace original query',
                          });
                        }
                      }}
                      className="text-xs"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Replace Original
                    </Button>
                  )}
                </div>
              </div>
              <CodeBlock
                code={optimizedQuery.optimizedSql}
                language="sql"
                title="Optimized SQL"
                maxHeight="400px"
                showDownload
                filename="optimized-query.sql"
              />
            </div>

            {/* Explanation */}
            {optimizedQuery.explanation && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Overall Explanation
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">{optimizedQuery.explanation}</p>
              </div>
            )}

            {/* Optimizations Applied */}
            {optimizedQuery.optimizations && optimizedQuery.optimizations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Optimizations Applied</h4>
                <div className="space-y-3">
                  {optimizedQuery.optimizations.map((opt: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            {opt.type}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${
                              opt.impact === 'high'
                                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                : opt.impact === 'medium'
                                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            }`}
                          >
                            {opt.impact} impact
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{opt.description}</p>
                      
                      {(opt as any).originalPart && (opt as any).optimizedPart && (
                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Before:</p>
                            <code className="text-xs bg-white dark:bg-gray-900 p-2 rounded block text-red-600 dark:text-red-400">
                              {(opt as any).originalPart}
                            </code>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">After:</p>
                            <code className="text-xs bg-white dark:bg-gray-900 p-2 rounded block text-green-600 dark:text-green-400">
                              {(opt as any).optimizedPart}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Index Recommendations */}
            {(optimizedQuery as any).indexRecommendations && (optimizedQuery as any).indexRecommendations.length > 0 && (
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Recommended Indexes
                </h4>
                <div className="space-y-3">
                  {(optimizedQuery as any).indexRecommendations.map((idx: any, index: number) => (
                    <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                          {idx.table} - {idx.type || 'btree'}
                        </span>
                      </div>
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded block text-gray-800 dark:text-gray-200 mb-2">
                        {idx.createStatement}
                      </code>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">{idx.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Notes */}
            {(optimizedQuery as any).performanceNotes && (
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Additional Performance Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {(optimizedQuery as any).performanceNotes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setManualQuery(optimizedQuery.optimizedSql);
                  setActiveTab('optimize');
                }}
              >
                Use as Input
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeQuery(optimizedQuery.optimizedSql)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analyze Optimized
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Example Queries */}
      <Card title="Example Queries" subtitle="Click to try these natural language queries">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => {
                setNaturalLanguageInput(example);
                setActiveTab('natural');
              }}
              className="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">{example}</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
