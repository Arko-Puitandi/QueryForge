import React, { useState, useEffect } from 'react';
import { Button, Card, Textarea, CodeBlock, Loading, Select } from '../components/common';
import { VoiceInput } from '../components/voice';
import { MockDataGenerator } from '../components/schema';
import { useSchema } from '../hooks';
import { useAppStore } from '../stores';
import { DatabaseType, Schema } from '../types';
import { Mic, Keyboard, RotateCcw, Download, Upload, FileJson } from 'lucide-react';
import { useNotificationStore } from '../stores';

// Simple SQL generator for display purposes when SQL is missing
const generateDisplaySql = (schema: Schema, databaseType: string): string => {
  if (!schema || !schema.tables || schema.tables.length === 0) return '';
  
  let sql = `-- ${schema.name || 'Generated Schema'}\n`;
  sql += `-- Database: ${databaseType}\n`;
  sql += `-- Tables: ${schema.tables.length}\n\n`;
  
  schema.tables.forEach((table) => {
    sql += `CREATE TABLE ${table.name} (\n`;
    const columnDefs = table.columns.map((col) => {
      let def = `  ${col.name} ${col.type}`;
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (!col.nullable) def += ' NOT NULL';
      if (col.unique) def += ' UNIQUE';
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
      return def;
    });
    sql += columnDefs.join(',\n');
    sql += '\n);\n\n';
  });
  
  // Add foreign keys
  schema.tables.forEach((table) => {
    table.columns.forEach((col) => {
      if (col.references) {
        sql += `ALTER TABLE ${table.name}\n`;
        sql += `  ADD CONSTRAINT fk_${table.name}_${col.name}\n`;
        sql += `  FOREIGN KEY (${col.name}) REFERENCES ${col.references.table}(${col.references.column});\n\n`;
      }
    });
  });
  
  return sql;
};

export const SchemaPage: React.FC = () => {
  const [includeConstraints, setIncludeConstraints] = useState(true);
  const [includeIndexes, setIncludeIndexes] = useState(true);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [activeTab, setActiveTab] = useState<'describe' | 'sql' | 'mockdata' | 'templates' | 'upload' | 'settings'>('describe');
  
  const { currentSchema, generatedSql, isLoading, error, generateSchema } = useSchema();
  const { 
    selectedDatabase, 
    setSelectedDatabase, 
    schemaDescription, 
    setSchemaDescription, 
    resetSchema,
    syncSchemaToServer,
    setPendingSchemaChange,
    currentSchema: storeCurrentSchema,
    generatedSql: storeGeneratedSql,
  } = useAppStore();
  const { addNotification } = useNotificationStore();
  
  // Use either the hook's SQL or generate display SQL as fallback
  const displaySql = generatedSql || storeGeneratedSql || 
    (currentSchema ? generateDisplaySql(currentSchema, selectedDatabase) : '');

  const handleGenerate = async () => {
    if (!schemaDescription.trim()) return;
    await generateSchema(schemaDescription, selectedDatabase, {
      includeConstraints,
      includeIndexes,
    });
  };

  const handleTemplateSelect = (prompt: string) => {
    setSchemaDescription(prompt);
    setActiveTab('describe');
  };

  const handleExportSchema = (format: 'json' | 'sql') => {
    if (!currentSchema) {
      addNotification({
        type: 'error',
        message: 'No schema available to export',
      });
      return;
    }

    try {
      const fileName = `schema_${selectedDatabase}_${new Date().getTime()}`;
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify(currentSchema, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else {
        content = displaySql || '';
        mimeType = 'text/plain';
        extension = 'sql';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);

      addNotification({
        type: 'success',
        message: `Schema exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting schema:', error);
      addNotification({
        type: 'error',
        message: 'Failed to export schema',
      });
    }
  };

  const handleImportSchema = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          const schema = JSON.parse(content) as Schema;
          // Validate the schema
          if (schema.tables && Array.isArray(schema.tables)) {
            // Create a description from the schema
            const description = `Imported schema with ${schema.tables.length} tables: ${schema.tables.map((t: any) => t.name).join(', ')}`;
            
            // Ensure schema has a name
            if (!schema.name) {
              schema.name = file.name.replace('.json', '');
            }
            
            // Check if there's already a schema loaded - show confirmation
            if (storeCurrentSchema && storeCurrentSchema.tables && storeCurrentSchema.tables.length > 0) {
              setPendingSchemaChange({
                schema,
                databaseType: selectedDatabase,
                description,
                source: 'import',
              });
            } else {
              // No existing schema, sync directly to server
              try {
                await syncSchemaToServer(schema, undefined, undefined);
                setSchemaDescription(description);
                addNotification({
                  type: 'success',
                  message: 'Schema imported and synced successfully',
                });
              } catch (syncError) {
                console.error('Error syncing imported schema:', syncError);
                addNotification({
                  type: 'error',
                  message: 'Failed to sync imported schema to server',
                });
              }
            }
          } else {
            throw new Error('Invalid schema format');
          }
        } else if (file.name.endsWith('.sql')) {
          // For SQL files, use the content as description to generate a schema
          setSchemaDescription(`Imported SQL schema from ${file.name}:\n${content.substring(0, 500)}...`);
          addNotification({
            type: 'info',
            message: 'SQL file imported - click Generate to create schema from it',
          });
        } else {
          throw new Error('Unsupported file format');
        }
      } catch (error) {
        console.error('Error importing schema:', error);
        addNotification({
          type: 'error',
          message: 'Failed to import schema. Please check the file format.',
        });
      }
    };
    reader.readAsText(file);
    // Reset the input
    event.target.value = '';
  };

  const databaseOptions = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'sqlserver', label: 'SQL Server' },
  ];

  const exampleDescriptions = [
    'E-commerce platform with users, products, orders, and reviews',
    'Social media app with users, posts, comments, likes, and followers',
    'Hospital management system with patients, doctors, appointments, and prescriptions',
    'Online learning platform with courses, lessons, students, and progress tracking',
    'Inventory management system with products, warehouses, suppliers, and stock movements',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schema Builder</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Generate database schemas from natural language descriptions using AI
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('describe')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'describe'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Describe Schema
          </button>
          <button
            onClick={() => setActiveTab('mockdata')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'mockdata'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            disabled={!currentSchema || !currentSchema.tables || currentSchema.tables.length === 0}
          >
            Generate Mock Data
          </button>
        </nav>
      </div>

      {/* Describe Tab Content */}
      {activeTab === 'describe' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card title="Describe Your Database" className="h-fit">
          <div className="space-y-4">
            <Select
              label="Target Database"
              options={databaseOptions}
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value as DatabaseType)}
            />

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
              <>
                <Textarea
                  label="Database Description"
                  placeholder="Describe the database you want to create. Include entities, relationships, and any specific requirements..."
                  value={schemaDescription}
                  onChange={(e) => setSchemaDescription(e.target.value)}
                  rows={8}
                  helperText="Be specific about entities, their attributes, and relationships between them."
                />
              </>
            ) : (
              <VoiceInput
                onTranscript={(text) => setSchemaDescription(text)}
                placeholder="Click the microphone and describe your database..."
              />
            )}

            {/* Show current description when in voice mode */}
            {inputMode === 'voice' && schemaDescription && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                  Current Description:
                </label>
                <p className="text-sm text-gray-700 dark:text-gray-300">{schemaDescription}</p>
                <button
                  type="button"
                  onClick={() => setSchemaDescription('')}
                  className="mt-2 text-xs text-red-500 hover:text-red-600"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConstraints}
                  onChange={(e) => setIncludeConstraints(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include Constraints</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIndexes}
                  onChange={(e) => setIncludeIndexes(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include Indexes</span>
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                isLoading={isLoading}
                disabled={!schemaDescription.trim()}
                className="flex-1"
              >
                Generate Schema
              </Button>
              <Button
                variant="secondary"
                onClick={resetSchema}
                disabled={isLoading}
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Import Schema */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <input
                type="file"
                id="schema-import"
                accept=".json,.sql"
                onChange={handleImportSchema}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => document.getElementById('schema-import')?.click()}
                className="w-full"
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Import Schema (JSON/SQL)
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Output Section */}
        <Card title="Generated Schema" className="h-fit">
          {isLoading ? (
            <Loading size="lg" text="Generating schema with AI..." />
          ) : error ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          ) : currentSchema && currentSchema.tables && currentSchema.tables.length > 0 ? (
            <div className="space-y-4">
              {/* Export Buttons */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Export Schema</h3>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExportSchema('json')}
                    className="text-xs"
                  >
                    <FileJson className="w-3.5 h-3.5 mr-1" />
                    Export JSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExportSchema('sql')}
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Export SQL
                  </Button>
                </div>
              </div>

              {displaySql && (
                <CodeBlock
                  code={displaySql}
                  language="sql"
                  title="SQL Schema"
                  maxHeight="500px"
                  showDownload
                  filename={`schema_${selectedDatabase}.sql`}
                />
              )}
              {currentSchema.tables && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tables: {currentSchema.tables.length}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentSchema.tables.map((table) => (
                      <span
                        key={table.name}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm"
                      >
                        {table.name} ({table.columns.length})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <p>Your generated schema will appear here</p>
            </div>
          )}
        </Card>
      </div>

      {/* Example Templates */}
      <Card title="Example Descriptions" subtitle="Click to use and auto-generate">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {exampleDescriptions.map((example, index) => (
            <button
              key={index}
              onClick={async () => {
                setSchemaDescription(example);
                // Auto-generate when example is clicked
                if (!isLoading) {
                  await generateSchema(example, selectedDatabase, {
                    includeConstraints,
                    includeIndexes,
                  });
                }
              }}
              disabled={isLoading}
              className="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">{example}</p>
            </button>
          ))}
        </div>
      </Card>
        </>
      )}

      {/* Mock Data Tab Content */}
      {activeTab === 'mockdata' && (
        <div className="space-y-6">
          {currentSchema && currentSchema.tables && currentSchema.tables.length > 0 ? (
            <>
              <Card>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Mock Data</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Generate realistic sample data for your database schema for testing and development
                  </p>
                </div>
                <MockDataGenerator 
                  tables={currentSchema.tables}
                  onDataGenerated={(data) => {
                    addNotification({
                      type: 'success',
                      message: `Generated ${Object.values(data).reduce((sum, rows) => sum + rows.length, 0)} rows of mock data`,
                    });
                  }}
                />
              </Card>

              {/* Current Schema Reference */}
              <Card title="Current Schema Tables">
                <div className="flex flex-wrap gap-2">
                  {currentSchema.tables.map((table) => (
                    <span
                      key={table.name}
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium"
                    >
                      {table.name} ({table.columns.length} columns)
                    </span>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Schema Available</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You need to generate a database schema first before creating mock data.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setActiveTab('describe')}
                >
                  Generate Schema
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
