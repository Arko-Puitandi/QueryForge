import React, { useState } from 'react';
import { Button, Card, Textarea, CodeBlock, Loading, Select, Tabs } from '../components/common';
import { VoiceInput } from '../components/voice';
import { MockDataGenerator, TemplatesGallery, SchemaUploader } from '../components/schema';
import { useSchema } from '../hooks';
import { useAppStore } from '../stores';
import { DatabaseType } from '../types';
import { Mic, Keyboard, RotateCcw, Upload } from 'lucide-react';
import { optimizeSchema } from '../services/api';
import { useNotificationStore } from '../stores';

export const SchemaPage: React.FC = () => {
  const [includeConstraints, setIncludeConstraints] = useState(true);
  const [includeIndexes, setIncludeIndexes] = useState(true);
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'upload'>('text');
  const [viewMode, setViewMode] = useState<'sql' | 'mockdata'>('sql');
  const [showTemplates, setShowTemplates] = useState(false);
  
  const { currentSchema, generatedSql, isLoading, error, generateSchema } = useSchema();
  const { selectedDatabase, setSelectedDatabase, schemaDescription, setSchemaDescription, resetSchema } = useAppStore();
  const { addNotification } = useNotificationStore();

  const handleGenerate = async () => {
    if (!schemaDescription.trim()) return;
    await generateSchema(schemaDescription, selectedDatabase, {
      includeConstraints,
      includeIndexes,
    });
  };

  const handleTemplateSelect = (prompt: string) => {
    setSchemaDescription(prompt);
    setShowTemplates(false);
  };

  const handleSchemaUpload = (schema: any, metadata: { filename: string; type: string }) => {
    // Generate a description from the uploaded schema
    const description = `Uploaded schema from ${metadata.filename} with ${schema.tables?.length || 0} tables: ${
      schema.tables?.map((t: any) => t.name).join(', ') || 'unknown tables'
    }`;
    setSchemaDescription(description);
    
    addNotification({
      type: 'success',
      title: 'Schema Uploaded',
      message: `Schema uploaded successfully: ${metadata.filename}`,
    });
  };

  const handleSchemaOptimize = async (schema: any) => {
    try {
      const response = await optimizeSchema(schema);
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: 'Schema Optimized',
          message: 'Schema optimized successfully with AI recommendations',
        });
        
        // Update description with optimization notes
        if (response.data.suggestions) {
          const optimizationNotes = `\n\nAI Optimization Applied:\n${response.data.suggestions.join('\n')}`;
          setSchemaDescription(schemaDescription + optimizationNotes);
        }
      }
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Optimization Failed',
        message: 'Failed to optimize schema. Please try again.',
      });
    }
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
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                    inputMode === 'upload'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload
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
                <Button
                  variant="secondary"
                  onClick={() => setShowTemplates(true)}
                  className="w-full"
                >
                  Browse Templates
                </Button>
              </>
            ) : inputMode === 'voice' ? (
              <VoiceInput
                onTranscript={(text) => setSchemaDescription(text)}
                placeholder="Click the microphone and describe your database..."
              />
            ) : (
              <SchemaUploader
                onSchemaUpload={handleSchemaUpload}
                onOptimize={handleSchemaOptimize}
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
          ) : currentSchema && generatedSql ? (
            <div className="space-y-4">
              <div className="mb-4">
                <Tabs
                  tabs={[
                    { id: 'sql', label: 'SQL View' },
                    { id: 'mockdata', label: 'Mock Data Generator' }
                  ]}
                  activeTab={viewMode}
                  onChange={(tabId) => setViewMode(tabId as 'sql' | 'mockdata')}
                />
              </div>

              {viewMode === 'sql' && (
                <>
                  <CodeBlock
                    code={generatedSql}
                    language="sql"
                    title="SQL Schema"
                    maxHeight="500px"
                    showDownload
                    filename={`schema_${selectedDatabase}.sql`}
                  />
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
                </>
              )}

              {viewMode === 'mockdata' && currentSchema.tables && (
                <div>
                  <MockDataGenerator tables={currentSchema.tables} />
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
      <Card title="Example Descriptions" subtitle="Click to use as a starting point">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {exampleDescriptions.map((example, index) => (
            <button
              key={index}
              onClick={() => setSchemaDescription(example)}
              className="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">{example}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesGallery 
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
};
